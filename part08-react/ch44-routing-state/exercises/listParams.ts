// 第44章 練習問題1: URL の検索パラメータと、一覧の条件の行き来（本文4節）
import type { Status } from './types.ts';

export type ListParams = { statuses: Status[]; page: number; q: string };

export function parseListParams(params: URLSearchParams): ListParams {
  throw new Error('まだ書いていません');
}

export function toListParams(p: ListParams): URLSearchParams {
  throw new Error('まだ書いていません');
}
