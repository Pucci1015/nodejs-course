// 練習問題6 の模範解答
import type { Request, RequestHandler } from 'express';
import { z } from 'zod';

/** 確かめるもの。どれも省略できる */
export type Schemas = { params?: z.ZodType; query?: z.ZodType; body?: z.ZodType };

/** スキーマがあれば、確かめた後の型。無ければ undefined */
type Out<S, K extends keyof Schemas> = S extends { [P in K]: infer T extends z.ZodType } ? z.output<T> : undefined;

/** ハンドラが受け取るもの */
export type Input<S extends Schemas> = { params: Out<S, 'params'>; query: Out<S, 'query'>; body: Out<S, 'body'> };

/** ハンドラが返すもの。body が undefined なら、ボディ無しで返す */
export type Reply = { status: number; body?: unknown; headers?: Record<string, string> };

type FieldError = { pointer: string; detail: string };

const TITLES: Record<number, string> = { 400: 'Bad Request', 404: 'Not Found', 422: 'Unprocessable Content' };

function toErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({ pointer: issue.path.map((p) => `/${String(p)}`).join(''), detail: issue.message }));
}

/**
 * 確かめてからハンドラを呼ぶ、Express のハンドラを作る。
 * params がだめなら 404、query がだめなら 400、body がだめなら 422（problem+json）
 */
export function route<S extends Schemas>(schemas: S, handler: (input: Input<S>, req: Request) => Promise<Reply>): RequestHandler {
  return async (req, res) => {
    const checks = [
      ['params', 404, req.params],
      ['query', 400, req.query],
      ['body', 422, req.body],
    ] as const;
    const values: Record<string, unknown> = {};
    for (const [key, status, value] of checks) {
      const schema = schemas[key];
      if (schema === undefined) continue;
      const result = schema.safeParse(value);
      if (!result.success) {
        res
          .status(status)
          .type('application/problem+json')
          .json({
            type: 'about:blank',
            title: TITLES[status],
            status,
            detail: status === 404 ? '見つかりません' : '入力が正しくありません',
            ...(status === 404 ? {} : { errors: toErrors(result.error) }),
          });
        return;
      }
      values[key] = result.data;
    }
    // values の中身は、上で schemas[key] で確かめたもの。ただし、キーごとに違う型になることを、tsc は追いかけられない。
    // ジェネリクスの部品の中で1か所だけ、as で言い切る（第35章 6節。使う側には、正しい型だけが見える）
    const input = { params: values.params, query: values.query, body: values.body } as Input<S>;
    const reply = await handler(input, req);
    if (reply.headers !== undefined) res.set(reply.headers);
    res.status(reply.status);
    if (reply.body === undefined) res.end();
    else res.json(reply.body);
  };
}

