// サンプルで使う、エラーを RFC 9457（Problem Details）の形で返す小さな部品（第25章 4節）
// 練習問題5では、これをもっときちんとした problemHandler にします。

export class HttpProblem extends Error {
  /**
   * @param {number} status
   * @param {{ title?: string, detail?: string, type?: string, errors?: Array<{ pointer?: string, parameter?: string, detail: string }>, headers?: object }} [fields]
   */
  constructor(status, { title, detail, type = 'about:blank', errors, headers } = {}) {
    super(detail ?? title ?? `HTTP ${status}`);
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.type = type;
    this.errors = errors;
    this.headers = headers;
  }
}

const TITLES = { 400: 'Bad Request', 404: 'Not Found', 409: 'Conflict', 412: 'Precondition Failed', 415: 'Unsupported Media Type', 422: 'Unprocessable Content', 428: 'Precondition Required', 500: 'Internal Server Error' };

/** problem+json を返す */
export function sendProblem(res, status, fields = {}) {
  const body = { type: fields.type ?? 'about:blank', title: fields.title ?? TITLES[status] ?? 'Error', status };
  if (fields.detail) body.detail = fields.detail;
  if (fields.instance) body.instance = fields.instance;
  if (fields.errors) body.errors = fields.errors;
  res.status(status).type('application/problem+json').send(JSON.stringify(body));
}

/** 最後に置くエラーハンドラ（サンプル用の簡単なもの） */
export function problemHandler() {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (err instanceof HttpProblem) {
      if (err.headers) res.set(err.headers);
      return sendProblem(res, err.status, { ...err, instance: req.originalUrl });
    }
    if (err.type === 'entity.parse.failed') return sendProblem(res, 400, { detail: 'JSON の形が正しくありません', instance: req.originalUrl });
    console.error(err);
    sendProblem(res, 500, { instance: req.originalUrl });
  };
}
