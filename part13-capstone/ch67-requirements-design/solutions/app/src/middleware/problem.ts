// 第25章 練習問題5の模範解答（ch25-rest-api-design/solutions/problem.mjs）のコピー。ログの書き方だけ変えた
// TypeScript にした。エラーのミドルウェアの err は unknown なので、形を確かめてから読む
// 500 の応答とログに errorId を付ける（第55章 10節・第66章 2節）。利用者が問い合わせに書けば、ログで探せる
import crypto from 'node:crypto';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export const TITLES: Record<number, string> = {
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

/** errors の1つ。ボディの間違いは pointer、クエリの間違いは parameter で場所を指す */
export type ProblemError = { pointer?: string; parameter?: string; detail: string };

export type ProblemOptions = {
  type?: string;
  title?: string | undefined;
  detail?: string | undefined;
  errors?: ProblemError[] | undefined;
  headers?: Record<string, string> | undefined;
};

export class HttpProblem extends Error {
  readonly status: number;
  readonly type: string;
  readonly title: string | undefined;
  readonly detail: string | undefined;
  readonly errors: ProblemError[] | undefined;
  readonly headers: Record<string, string> | undefined;

  constructor(status: number, { type = 'about:blank', title, detail, errors, headers }: ProblemOptions = {}) {
    // 追加: 成功のステータスや、ありえない値で作れないようにする
    if (!Number.isInteger(status) || status < 400 || status > 599)
      throw new RangeError(`HttpProblem の status は 400〜599 です: ${status}`);
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
export function toPointer(path: readonly PropertyKey[]): string {
  return `#${path.map((p) => `/${String(p).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('')}`;
}

type Body = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: ProblemError[];
  errorId?: string;
};

/** 本文を作って送る。undefined の項目は出さない */
function send(
  res: Response,
  status: number,
  {
    type = 'about:blank',
    title,
    detail,
    instance,
    errors,
    errorId,
  }: Omit<ProblemOptions, 'headers'> & { instance?: string; errorId?: string } = {},
): void {
  const body: Body = { type, title: title ?? TITLES[status] ?? 'Error', status };
  if (errorId !== undefined) body.errorId = errorId;
  if (detail !== undefined) body.detail = detail;
  if (instance !== undefined) body.instance = instance;
  if (errors !== undefined) body.errors = errors;
  res.status(status).type('application/problem+json').send(JSON.stringify(body));
}

// body-parser（express.json の中身）のエラーの種類と、返すもの
const BODY_ERRORS: Record<string, [number, string]> = {
  'entity.parse.failed': [400, 'JSON の形が正しくありません'],
  'entity.too.large': [413, 'ボディが大きすぎます'],
  'charset.unsupported': [415, 'この文字コードは使えません。UTF-8 で送ってください'],
  'encoding.unsupported': [415, 'この Content-Encoding は使えません'],
  'request.aborted': [400, 'リクエストが途中で切れました'],
};

/** err の key の項目を読む。オブジェクトでなければ undefined（Reflect.get(o, key) は o[key] と同じ。key が string でも型のエラーにならない） */
function prop(err: unknown, key: string): unknown {
  return typeof err === 'object' && err !== null && key in err ? Reflect.get(err, key) : undefined;
}

export function notFound(): RequestHandler {
  return (req, res) => send(res, 404, { detail: `${req.method} ${req.path} はありません`, instance: req.originalUrl });
}

export function problemHandler({ log = console.error }: { log?: (err: unknown) => void } = {}): ErrorRequestHandler {
  return (err: unknown, req, res, next) => {
    if (res.headersSent) return next(err); // 追加: 途中まで送った後は、Express に任せて接続を切る
    const instance = req.originalUrl;

    if (err instanceof HttpProblem) {
      if (err.headers) res.set(err.headers);
      return send(res, err.status, {
        type: err.type,
        title: err.title,
        detail: err.detail,
        instance,
        errors: err.errors,
      });
    }
    if (err instanceof ZodError) {
      const errors = err.issues.map((i) => ({ pointer: toPointer(i.path), detail: i.message }));
      return send(res, 422, { instance, errors });
    }
    const bodyError = BODY_ERRORS[String(prop(err, 'type'))];
    if (bodyError !== undefined) {
      const [status, detail] = bodyError;
      return send(res, status, { detail, instance });
    }
    // Express やパッケージが付けた 400 番台（壊れた %xx の 400 など）。文は自分で書いたものではないので出さない
    const status = prop(err, 'status') ?? prop(err, 'statusCode');
    if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status < 500)
      return send(res, status, { instance });

    // requestLogger が作った req.log があれば、それに書く（reqId が付くので、どのリクエストか分かる）
    // express.d.ts で req.log は必ずある型にしたが、requestLogger より前で起きたエラーのために確かめる
    // errorId を作って、ログと応答の両方に書く（エラーの中身は応答に出さない）
    const errorId = crypto.randomUUID();
    if (Object.hasOwn(req, 'log')) req.log.error({ err, errorId }, '思っていなかったエラー');
    else log(err); // 500 だけをログに書く
    send(res, 500, { instance, errorId });
  };
}

export { ZodError };
