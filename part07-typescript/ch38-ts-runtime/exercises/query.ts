// 練習問題3: 一覧の API のクエリを Zod で確かめる関数を書いてください。要件は README にあります。
// 確かめ方: node --test query.test.ts
import { z } from 'zod';

// ここにクエリのスキーマを書く

/** 確かめた後のクエリ。スキーマから作る（z.output） */
export type ListQuery = unknown;
export type QueryError = { parameter: string; detail: string };
export type ListQueryResult = { ok: true; value: ListQuery } | { ok: false; errors: QueryError[] };

export function parseListQuery(query: unknown): ListQueryResult {
  throw new Error('まだ書いていません');
}
