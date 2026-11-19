// 第68章 練習問題8: 管理者向けの「その日、会議室がどれだけ使われたか」を SQL で数える（本文 4.2節）
import type pg from 'pg';
import { dayRange } from './domain/time.ts';

export type UsageRow = { roomId: number; roomName: string; count: number; minutes: number };

/**
 * date（日本の日付 'YYYY-MM-DD'）の、使える会議室（active）ごとの予約の数と、予約した分の合計
 * - 取り消した予約は数えない
 * - 予約が1件も無い会議室も、count 0・minutes 0 で出す
 * - 停止した会議室（active が false）は出さない
 * - 会議室の id の順
 * - SQL は1回だけ。値はプレースホルダ（$1）で渡す
 */
export async function usageReport(db: pg.ClientBase, date: string): Promise<UsageRow[]> {
  const { from, to } = dayRange(date);
  // ここを書く
  throw new Error(`まだ書いていません（${db === undefined}, ${from.toISOString()}, ${to.toISOString()}）`);
}
