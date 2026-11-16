// 練習問題6 の型の確かめ（書き換えない）
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { Equal, Expect } from './type-assert.ts';
import { route } from './route.ts';

const Id = z.object({ id: z.string().regex(/^[0-9]+$/).transform(Number) });
const Body = z.object({ title: z.string(), tags: z.array(z.string()).default([]) });

export const h1: RequestHandler = route({ params: Id, body: Body }, async ({ params, query, body }) => {
  type _ = [
    Expect<Equal<typeof params, { id: number }>>,
    Expect<Equal<typeof query, undefined>>,
    Expect<Equal<typeof body, { title: string; tags: string[] }>>,
  ];
  return { status: 201, body: { id: params.id, ...body }, headers: { location: `/x/${params.id}` } };
});

export const h2 = route({}, async ({ params, body }, req) => {
  type _ = [Expect<Equal<typeof params, undefined>>, Expect<Equal<typeof body, undefined>>];
  return { status: 204, headers: { 'x-path': req.path } };
});

// @ts-expect-error ハンドラは Reply（status が要る）の Promise を返す
export const h3 = route({}, async () => ({ body: 1 }));
