// 自分で書く小さなミドルウェア（第24章 4〜5節）。ほかのサンプルから import して使う
import crypto from 'node:crypto';

const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

/** リクエスト ID を決めて req.id と X-Request-Id に入れる（第17章の createApp と同じ考え方） */
export function requestId() {
  return (req, res, next) => {
    const incoming = req.get('x-request-id');
    req.id = incoming && ID_RE.test(incoming) ? incoming : crypto.randomUUID();
    res.set('X-Request-Id', req.id);
    next();
  };
}

/**
 * 応答が終わったときに1行のログを書く。
 * finish は「最後まで書き終えた」とき、close は「接続が閉じた」とき（客が先に切ったときも来る）。
 * close だけを見て、writableFinished で「最後まで返せたか」を見分ける（第17章 練習問題5と同じ）
 */
export function accessLog({ write = (line) => console.log(line) } = {}) {
  return (req, res, next) => {
    const start = performance.now();
    res.once('close', () => {
      const ms = (performance.now() - start).toFixed(1);
      const status = res.writableFinished ? res.statusCode : 'aborted';
      write(`${req.method} ${req.originalUrl} ${status} ${ms}ms ${req.id ?? '-'}`);
    });
    next();
  };
}

/** 処理にかかった時間を Server-Timing ヘッダで返す（DevTools の Network → Timing に出る） */
export function serverTiming() {
  return (req, res, next) => {
    const start = performance.now();
    // ヘッダは本文より先に送られるので、「ヘッダを書く直前」に時間を測る。
    // res.writeHead を包むのは第22章の withSession と同じ方法
    const writeHead = res.writeHead;
    res.writeHead = function (...args) {
      if (!res.headersSent) res.setHeader('Server-Timing', `app;dur=${(performance.now() - start).toFixed(1)}`);
      return writeHead.apply(this, args);
    };
    next();
  };
}
