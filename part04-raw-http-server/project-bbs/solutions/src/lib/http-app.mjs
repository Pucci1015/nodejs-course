// 練習問題3 解答例: ハンドラを包んで、エラー・リクエスト ID・アクセスログをまとめて扱う
import crypto from 'node:crypto';

// 客に見せてよいエラー（400 番台）。メッセージをそのまま返す
export class HttpError extends Error {
  constructor(status, message, { headers = {} } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.headers = headers;
  }
}

const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

function sendError(res, status, message, requestId, headers = {}) {
  const body = JSON.stringify({ error: message, requestId });
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

/**
 * @param {(req, res) => unknown} handler
 * @param {{ logger?: { info: Function, error: Function }, now?: () => number }} [options]
 * @returns {(req, res) => Promise<void>} http.createServer に渡す関数
 */
export function createApp(handler, { logger = console, now = () => performance.now() } = {}) {
  return async (req, res) => {
    const start = now();
    // 客が付けてきた ID は、形が正しいときだけ使う（ログに変な文字を書かせない）
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && ID_RE.test(incoming) ? incoming : crypto.randomUUID();
    req.id = id;
    res.setHeader('X-Request-Id', id);

    // close は、終わりまで返せたときも、客が先に切ったときも、必ず1回来る
    res.once('close', () => {
      const ms = Math.round(now() - start);
      const status = res.writableFinished ? res.statusCode : 'aborted';
      logger.info(`${req.method} ${req.url} ${status} ${ms}ms ${id}`);
    });

    try {
      await handler(req, res);
    } catch (err) {
      const isClient = err instanceof HttpError && err.status >= 400 && err.status < 500;
      if (!isClient) logger.error(`[${id}] ${req.method} ${req.url}`, err);
      if (res.headersSent) {
        res.destroy(); // 途中まで返してしまった。切って、失敗したことを客に伝える
        return;
      }
      if (isClient) sendError(res, err.status, err.message, id, err.headers);
      else sendError(res, 500, 'Internal Server Error', id); // 中身（スタックなど）は見せない
    }
  };
}
