// 練習問題4の模範解答: アクセスログのミドルウェア
const SECRET_NAMES = new Set(['token', 'password', 'secret', 'code', 'key']); // 追加: ログに残さないクエリの名前
const MAX_PATH = 200;

// 追加: クエリの秘密の値を隠す。URL は「ログに残る・ブラウザの履歴に残る・Referer で送られる」ので、
//       本当は秘密の値を URL に入れないのがいちばんよい（第10部）。それでも来てしまうものを、ログでは隠す
function redact(originalUrl) {
  const q = originalUrl.indexOf('?');
  if (q === -1) return originalUrl;
  const params = new URLSearchParams(originalUrl.slice(q + 1));
  for (const name of new Set(params.keys())) {
    if (SECRET_NAMES.has(name.toLowerCase())) params.set(name, '[redacted]');
  }
  return `${originalUrl.slice(0, q)}?${params}`;
}

/**
 * @param {{ write: (entry: object) => void, now?: () => number }} options
 */
export function accessLog({ write, now = () => performance.now() }) {
  return (req, res, next) => {
    const start = now();
    let bytes = 0;

    // 追加: 送った本文の量を数える。res.write と res.end を包む（第22章の withSession と同じ方法）
    const count = (chunk, encoding) => {
      if (chunk === undefined || chunk === null || typeof chunk === 'function') return;
      bytes += Buffer.isBuffer(chunk) || chunk instanceof Uint8Array ? chunk.byteLength : Buffer.byteLength(String(chunk), typeof encoding === 'string' ? encoding : 'utf8');
    };
    const { write: origWrite, end: origEnd } = res;
    res.write = function (chunk, encoding, cb) {
      count(chunk, encoding);
      return origWrite.call(this, chunk, encoding, cb);
    };
    res.end = function (chunk, encoding, cb) {
      count(chunk, encoding);
      return origEnd.call(this, chunk, encoding, cb);
    };

    // 修正: 応答が終わってから書く。close は、最後まで返せたときも、客が先に切ったときも、必ず1回来る
    res.once('close', () => {
      let path = redact(req.originalUrl);
      if (path.length > MAX_PATH) path = `${path.slice(0, MAX_PATH)}…`; // 追加: 長すぎる URL でログをふくらませない
      write({
        method: req.method,
        path,
        status: res.writableFinished ? res.statusCode : 'aborted',
        ms: Math.round(now() - start),
        bytes: req.method === 'HEAD' ? 0 : bytes, // HEAD では、Node.js が本文を捨てる
        id: req.id,
      });
    });
    next();
  };
}
