// 第68章 練習問題3: その日の予約の一覧のクエリ（?date=…&room=…）を確かめる（本文 3.1節・6.2節）
// 使ってよいもの: zod、./domain/time.ts（isDateString）
import { z } from 'zod';
import { isDateString } from './domain/time.ts';

/** 確かめた後のクエリ。room が無ければ全部の会議室 */
export type DayQuery = { date: string; room?: number };
/** 400 の errors[] の1つ（第5部 第25章の parameter） */
export type ParameterIssue = { parameter: string; detail: string };

/**
 * Express の req.query（文字列か、文字列の配列か、…）を確かめる
 * - date: 必須。本当にある日付（'YYYY-MM-DD'）
 * - room: 任意。1 以上の整数の文字列（'1'・'12'。'0'・'01'・'1.5'・'a' はだめ）
 * - ほかの名前があれば、その名前の issue（'知らない名前です'）
 * 合わないところを全部、issues で返す
 */
export function parseDayQuery(query: unknown): { ok: true; value: DayQuery } | { ok: false; issues: ParameterIssue[] } {
  // ここを書く
  void [z, isDateString];
  throw new Error(`まだ書いていません（${typeof query}）`);
}
