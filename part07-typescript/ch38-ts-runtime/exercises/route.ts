// 練習問題6: スキーマで確かめてからハンドラを呼ぶ、型の付いた Express のハンドラを作る関数 route を書いてください。要件は README にあります。
// 確かめ方: node --test route.test.ts
import type { Request, RequestHandler } from 'express';
import { z } from 'zod';

/** 確かめるもの。どれも省略できる */
export type Schemas = { params?: z.ZodType; query?: z.ZodType; body?: z.ZodType };

/** ハンドラが受け取るもの。ここを書く（スキーマがあれば確かめた後の型、無ければ undefined） */
export type Input<S extends Schemas> = { params: unknown; query: unknown; body: unknown };

/** ハンドラが返すもの。body が undefined なら、ボディ無しで返す */
export type Reply = { status: number; body?: unknown; headers?: Record<string, string> };

export function route<S extends Schemas>(schemas: S, handler: (input: Input<S>, req: Request) => Promise<Reply>): RequestHandler {
  throw new Error('まだ書いていません');
}
