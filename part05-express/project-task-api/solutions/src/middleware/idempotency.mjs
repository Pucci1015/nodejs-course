// Idempotency-Key で、POST を送り直しても二重に作らない（第25章 8節）
// 第25章のサンプル（ch25-rest-api-design/samples/idempotency-demo.mjs）の idempotent() を、成果物のために直したもの
//   - 覚える場所（store）を外から渡す（第26章 4節）。第6部では、データベースの表に取り替えられる
//   - 覚えておく時間（ttlMs）と、覚える数の上限（maxEntries）を決める。決めないと、メモリがふくらみ続ける
//   - 応答の本文だけでなく、Location と ETag も覚えて、2回目も同じものを返す
import crypto from 'node:crypto';
import { HttpProblem } from './problem.mjs';

const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;
const REPLAYED_HEADERS = ['location', 'etag'];

/**
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
    get(key) {
      prune();
      return map.get(key);
    },
    set(key, value) {
      map.delete(key); // 入れ直して、順番を最後にする
      map.set(key, { ...value, expiresAt: now() + ttlMs });
      prune();
    },
    delete: (key) => map.delete(key),
    size: () => map.size,
  };
}

/**
 * POST のルートの前に置くミドルウェア。express.json() の後で使う（ボディも「同じ中身か」に入れるため）
 * 本物では、キーを「だれが送ったか」（ログインしているユーザー）ごとに分けて覚える（第10部）
 * @param {ReturnType<typeof createIdempotencyStore>} store
 */
export function idempotency(store) {
  return (req, res, next) => {
    const key = req.get('idempotency-key');
    if (key === undefined) return next(); // キーが無ければ、ふつうに動かす（必須にするかは API の方針）
    if (!KEY_RE.test(key)) return next(new HttpProblem(400, { detail: 'Idempotency-Key は、英数字と - で 8〜64 文字です' }));

    // 同じキーで「別の中身」を送られたら、取り違えなので断る
    const fingerprint = crypto.createHash('sha256').update(`${req.method} ${req.originalUrl} ${JSON.stringify(req.body)}`).digest('hex');
    const prev = store.get(key);
    if (prev) {
      if (prev.fingerprint !== fingerprint) return next(new HttpProblem(422, { detail: 'この Idempotency-Key は、別の内容で使われています' }));
      if (prev.status === 'running') return next(new HttpProblem(409, { detail: '同じリクエストを処理中です' }));
      res.set(prev.response.headers);
      res.set('Idempotent-Replayed', 'true');
      return res.status(prev.response.status).json(prev.response.body); // 1回目と同じ応答を返す
    }

    store.set(key, { fingerprint, status: 'running' });
    // res.json を通らずに終わったとき（エラーハンドラが返した 422 など）は、覚えたキーを消す。消さないと、ずっと 409 になる
    res.once('close', () => {
      if (store.get(key)?.status === 'running') store.delete(key);
    });
    // 応答を覚えるために res.json を包む。覚えるのは 2xx だけ（4xx・5xx は、直して送り直せるように）
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const headers = {};
        for (const h of REPLAYED_HEADERS) if (res.getHeader(h) !== undefined) headers[h] = res.getHeader(h);
        store.set(key, { fingerprint, status: 'done', response: { status: res.statusCode, headers, body } });
      } else {
        store.delete(key);
      }
      return json(body);
    };
    next();
  };
}
