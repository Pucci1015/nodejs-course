// 練習問題2: エラーを Problem Details（RFC 9457）の形にそろえる
// 要件は exercises/README.md の問題2です。確かめ方:
//   $ node --test problem.test.mjs
import { ZodError } from 'zod';

export const TITLES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  412: 'Precondition Failed',
  413: 'Content Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Content',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

export class HttpProblem extends Error {
  constructor(status, { type = 'about:blank', title, detail, errors, headers } = {}) {
    super(detail ?? title ?? `HTTP ${status}`);
    // ここを書く: status の確かめ
    this.status = status;
    this.type = type;
    this.title = title;
    this.detail = detail;
    this.errors = errors;
    this.headers = headers;
  }
}

/** どのルートにもあてはまらなかったとき */
export function notFound() {
  return (req, res) => {
    // ここを書く
    res.status(404).json({ error: 'not_found' });
  };
}

/** いちばん最後に置くエラーハンドラ */
export function problemHandler({ log = console.error } = {}) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    // ここを書く
    log(err);
    res.status(err.status ?? 500).json({ error: err.message });
  };
}

export { ZodError };
