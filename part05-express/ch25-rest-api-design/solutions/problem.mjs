// 練習問題5の模範解答: エラーを Problem Details（RFC 9457）の形にそろえる
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
    // 追加: 成功のステータスや、ありえない値で作れないようにする
    if (!Number.isInteger(status) || status < 400 || status > 599) throw new RangeError(`HttpProblem の status は 400〜599 です: ${status}`);
    super(detail ?? title ?? `HTTP ${status}`);
    this.name = 'HttpProblem';
    this.status = status;
    this.type = type;
    this.title = title;
    this.detail = detail;
    this.errors = errors;
    this.headers = headers;
  }
}

/** zod の path（['tags', 1]）を JSON Pointer（#/tags/1）にする。~ と / はエスケープ（RFC 6901） */
export function toPointer(path) {
  return `#${path.map((p) => `/${String(p).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('')}`;
}

/** 本文を作って送る。undefined の項目は出さない */
function send(res, status, { type = 'about:blank', title, detail, instance, errors } = {}) {
  const body = { type, title: title ?? TITLES[status] ?? 'Error', status };
  if (detail !== undefined) body.detail = detail;
  if (instance !== undefined) body.instance = instance;
  if (errors !== undefined) body.errors = errors;
  res.status(status).type('application/problem+json').send(JSON.stringify(body));
}

// body-parser（express.json の中身）のエラーの種類と、返すもの
const BODY_ERRORS = {
  'entity.parse.failed': [400, 'JSON の形が正しくありません'],
  'entity.too.large': [413, 'ボディが大きすぎます'],
  'charset.unsupported': [415, 'この文字コードは使えません。UTF-8 で送ってください'],
  'encoding.unsupported': [415, 'この Content-Encoding は使えません'],
  'request.aborted': [400, 'リクエストが途中で切れました'],
};

export function notFound() {
  return (req, res) => send(res, 404, { detail: `${req.method} ${req.path} はありません`, instance: req.originalUrl });
}

export function problemHandler({ log = console.error } = {}) {
  return (err, req, res, next) => {
    if (res.headersSent) return next(err); // 追加: 途中まで送った後は、Express に任せて接続を切る
    const instance = req.originalUrl;

    if (err instanceof HttpProblem) {
      if (err.headers) res.set(err.headers);
      return send(res, err.status, { type: err.type, title: err.title, detail: err.detail, instance, errors: err.errors });
    }
    if (err instanceof ZodError) {
      const errors = err.issues.map((i) => ({ pointer: toPointer(i.path), detail: i.message }));
      return send(res, 422, { instance, errors });
    }
    if (BODY_ERRORS[err.type]) {
      const [status, detail] = BODY_ERRORS[err.type];
      return send(res, status, { detail, instance });
    }
    // Express やパッケージが付けた 400 番台（壊れた %xx の 400 など）。文は自分で書いたものではないので出さない
    const status = err.status ?? err.statusCode;
    if (Number.isInteger(status) && status >= 400 && status < 500) return send(res, status, { instance });

    log(err); // 500 だけをログに書く
    send(res, 500, { instance });
  };
}

export { ZodError };
