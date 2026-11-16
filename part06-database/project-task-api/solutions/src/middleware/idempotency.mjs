// Idempotency-Key で、POST を送り直しても二重に作らない（第25章 8節）
// 第25章のサンプル（ch25-rest-api-design/samples/idempotency-demo.mjs）の idempotent() を、成果物のために直したもの
//   - 覚える場所（store）を外から渡す（第26章 4節）
//   - 覚えておく時間（ttlMs）と、覚える数の上限（maxEntries）を決める。決めないと、メモリがふくらみ続ける
//   - 応答の本文だけでなく、Location と ETag も覚えて、2回目も同じものを返す
// 変更（第6部）: 覚える場所を、データベースの表（repositories/pg-idempotency.mjs）にも替えられるように、
//   store のメソッドを async にし、「無ければ自分のものにする」を claim の1回の呼び出しにした（2台のサーバが同時に同じキーを受けても、1台だけが動かす）
import crypto from 'node:crypto';
import { HttpProblem } from './problem.mjs';

const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;
const REPLAYED_HEADERS = ['location', 'etag'];

/**
 * メモリに覚える store（テストや、データベースを使わないとき用）。pg-idempotency.mjs と同じ形
 * キー → { fingerprint, status: 'running' | 'done', response, expiresAt }
 * @param {{ ttlMs?: number, maxEntries?: number, now?: () => number }} [options]
 */
export function createIdempotencyStore({ ttlMs = 24 * 60 * 60 * 1000, maxEntries = 10_000, now = Date.now } = {}) {
  const map = new Map(); // Map は入れた順に回るので、最初のものがいちばん古い
  const prune = () => {
    const t = now();
    for (const [k, v] of map) {
      if (v.expiresAt > t && map.size <= maxEntries) break; // 古い順なので、期限内のものに当たったら、その後ろも期限内
      map.delete(k);
    }
  };
  return {
    /** キーが無ければ「動かし中（running）」で覚えて null。あれば、覚えているもの { fingerprint, status, response } */
    async claim(key, fingerprint) {
      prune();
      const prev = map.get(key);
      if (prev) return prev;
      map.set(key, { fingerprint, status: 'running', expiresAt: now() + ttlMs });
      return null;
    },
    /** 応答を覚えて「済み（done）」にする */
    async complete(key, response) {
      const prev = map.get(key);
      map.delete(key); // 入れ直して、順番を最後にする
      map.set(key, { fingerprint: prev?.fingerprint, status: 'done', response, expiresAt: now() + ttlMs });
      prune();
    },
    async delete(key) {
      map.delete(key);
    },
    async purgeExpired() {
      prune();
    },
  };
}

/**
 * POST のルートの前に置くミドルウェア。express.json() の後で使う（ボディも「同じ中身か」に入れるため）
 * 本物では、キーを「だれが送ったか」（ログインしているユーザー）ごとに分けて覚える（第10部）
 * @param {ReturnType<typeof createIdempotencyStore>} store
 */
export function idempotency(store) {
  return async (req, res, next) => {
    const key = req.get('idempotency-key');
    if (key === undefined) return next(); // キーが無ければ、ふつうに動かす（必須にするかは API の方針）
    if (!KEY_RE.test(key)) return next(new HttpProblem(400, { detail: 'Idempotency-Key は、英数字と - で 8〜64 文字です' }));

    // 同じキーで「別の中身」を送られたら、取り違えなので断る
    const fingerprint = crypto.createHash('sha256').update(`${req.method} ${req.originalUrl} ${JSON.stringify(req.body)}`).digest('hex');
    // 変更（第6部）: 「探して、無ければ覚える」を1回で。別々にすると、2台が同時に「無い」と思って、両方が作ってしまう
    const prev = await store.claim(key, fingerprint);
    if (prev) {
      if (prev.fingerprint !== fingerprint) return next(new HttpProblem(422, { detail: 'この Idempotency-Key は、別の内容で使われています' }));
      if (prev.status === 'running') return next(new HttpProblem(409, { detail: '同じリクエストを処理中です' }));
      res.set(prev.response.headers);
      res.set('Idempotent-Replayed', 'true');
      return res.status(prev.response.status).json(prev.response.body); // 1回目と同じ応答を返す
    }

    let settled = false;
    // res.json を通らずに終わったとき（エラーハンドラが返した 422 など）は、覚えたキーを消す。消さないと、ずっと 409 になる
    res.once('close', () => {
      if (!settled) store.delete(key).catch(() => {});
    });
    // 応答を覚えるために res.json を包む。覚えるのは 2xx だけ（4xx・5xx は、直して送り直せるように）
    const json = res.json.bind(res);
    res.json = (body) => {
      settled = true;
      res.json = json; // 元に戻す（この後でエラーハンドラが res.json を使っても、ここに来ないように）
      let save;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const headers = {};
        for (const h of REPLAYED_HEADERS) if (res.getHeader(h) !== undefined) headers[h] = res.getHeader(h);
        save = store.complete(key, { status: res.statusCode, headers, body });
      } else {
        save = store.delete(key);
      }
      // 変更（第6部）: 覚え終わってから返す。返した後に送り直されても、「済み」が見えるように
      save.then(
        () => json(body),
        (err) => next(err),
      );
      return res;
    };
    next();
  };
}
