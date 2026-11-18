// Idempotency-Key で、POST を送り直しても二重に作らない（第25章 8節）
// 第25章のサンプル（ch25-rest-api-design/samples/idempotency-demo.mjs）の idempotent() を、成果物のために直したもの
//   - 覚える場所（store）を外から渡す（第26章 4節）
//   - 覚えておく時間（ttlMs）と、覚える数の上限（maxEntries）を決める。決めないと、メモリがふくらみ続ける
//   - 応答の本文だけでなく、Location と ETag も覚えて、2回目も同じものを返す
// 変更（第6部）: 覚える場所を、データベースの表（repositories/pg-idempotency.ts）にも替えられるように、
//   store のメソッドを async にし、「無ければ自分のものにする」を claim の1回の呼び出しにした（2台のサーバが同時に同じキーを受けても、1台だけが動かす）
// 変更（第7部）: TypeScript にした。store の形は types.ts の IdempotencyStore
// 変更（第10部）: キーを「だれが送ったか」ごとに分けて覚える（options.scope）
import crypto from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import type { IdempotencyRecord, IdempotencyStore, StoredResponse } from '../types.ts';
import { HttpProblem } from './problem.ts';

const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;
const REPLAYED_HEADERS = ['location', 'etag'];

type Entry = IdempotencyRecord & { expiresAt: number };

/**
 * メモリに覚える store（テストや、データベースを使わないとき用）。pg-idempotency.ts と同じ形
 */
export function createIdempotencyStore({
  ttlMs = 24 * 60 * 60 * 1000,
  maxEntries = 10_000,
  now = Date.now,
}: { ttlMs?: number; maxEntries?: number; now?: () => number } = {}): IdempotencyStore {
  const map = new Map<string, Entry>(); // Map は入れた順に回るので、最初のものがいちばん古い
  const prune = (): number => {
    const t = now();
    let removed = 0;
    for (const [k, v] of map) {
      if (v.expiresAt > t && map.size <= maxEntries) break; // 古い順なので、期限内のものに当たったら、その後ろも期限内
      map.delete(k);
      removed += 1;
    }
    return removed;
  };
  return {
    async claim(key, fingerprint) {
      prune();
      const prev = map.get(key);
      if (prev) return prev;
      map.set(key, { fingerprint, status: 'running', expiresAt: now() + ttlMs });
      return null;
    },
    async complete(key, response) {
      const prev = map.get(key);
      map.delete(key); // 入れ直して、順番を最後にする
      map.set(key, { fingerprint: prev?.fingerprint ?? '', status: 'done', response, expiresAt: now() + ttlMs });
      prune();
    },
    async delete(key) {
      map.delete(key);
    },
    async purgeExpired() {
      return prune();
    },
  };
}

/**
 * POST のルートの前に置くミドルウェア。express.json() の後で使う（ボディも「同じ中身か」に入れるため）
 * 変更（第10部）: options.scope があれば、キーを「scope の値:キー」として覚える（ログインしている人ごとに分ける）
 */
export function idempotency(
  store: IdempotencyStore,
  { scope }: { scope?: (req: Request) => string } = {},
): RequestHandler {
  return async (req, res, next) => {
    const headerKey = req.get('idempotency-key');
    if (headerKey === undefined) return next(); // キーが無ければ、ふつうに動かす（必須にするかは API の方針）
    if (!KEY_RE.test(headerKey))
      return next(new HttpProblem(400, { detail: 'Idempotency-Key は、英数字と - で 8〜64 文字です' }));
    // 追加（第10部）: alice の「abc12345」と bob の「abc12345」は、別のキー
    const key = scope === undefined ? headerKey : `${scope(req)}:${headerKey}`;

    // 同じキーで「別の中身」を送られたら、取り違えなので断る
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${req.method} ${req.originalUrl} ${JSON.stringify(req.body)}`)
      .digest('hex');
    // 変更（第6部）: 「探して、無ければ覚える」を1回で。別々にすると、2台が同時に「無い」と思って、両方が作ってしまう
    const prev = await store.claim(key, fingerprint);
    if (prev) {
      if (prev.fingerprint !== fingerprint)
        return next(new HttpProblem(422, { detail: 'この Idempotency-Key は、別の内容で使われています' }));
      // 変更（第7部）: status で絞り込むと、done のときだけ response がある（判別できるユニオン。第36章 2節）
      if (prev.status === 'running') return next(new HttpProblem(409, { detail: '同じリクエストを処理中です' }));
      res.set(prev.response.headers);
      res.set('Idempotent-Replayed', 'true');
      res.status(prev.response.status).json(prev.response.body); // 1回目と同じ応答を返す
      return;
    }

    let settled = false;
    // res.json を通らずに終わったとき（エラーハンドラが返した 422 など）は、覚えたキーを消す。消さないと、ずっと 409 になる
    res.once('close', () => {
      if (!settled) store.delete(key).catch(() => {});
    });
    // 応答を覚えるために res.json を包む。覚えるのは 2xx だけ（4xx・5xx は、直して送り直せるように）
    const json = res.json.bind(res);
    res.json = (body: unknown) => {
      settled = true;
      res.json = json; // 元に戻す（この後でエラーハンドラが res.json を使っても、ここに来ないように）
      let save: Promise<void>;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const headers: Record<string, string> = {};
        for (const h of REPLAYED_HEADERS) {
          const value = res.getHeader(h);
          if (value !== undefined) headers[h] = String(value);
        }
        const response: StoredResponse = { status: res.statusCode, headers, body };
        save = store.complete(key, response);
      } else {
        save = store.delete(key);
      }
      // 変更（第6部）: 覚え終わってから返す。返した後に送り直されても、「済み」が見えるように
      save.then(
        () => json(body),
        (err: unknown) => next(err),
      );
      return res;
    };
    next();
  };
}
