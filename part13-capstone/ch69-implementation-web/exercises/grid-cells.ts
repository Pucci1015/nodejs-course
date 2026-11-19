// 第69章 練習問題5: 表の1つの列（会議室）の、セルの作り方を純粋な関数にする（本文 3.1節）
import type { Slot } from './domain/slots.ts';

/** 1つのセル */
export type Cell<T> =
  | { kind: 'booked'; booking: T; span: number } // 予約の最初の枠。span 個の枠をまとめる（rowSpan）
  | { kind: 'covered' } // 上の booked のセルが覆っている枠（セルを出さない）
  | { kind: 'past' } // 過ぎた空きの枠（ボタンにしない）
  | { kind: 'free' }; // 空き（「空き」のボタン）

/**
 * slots（その日の枠）と busy（markBusy の結果: 枠ごとの予約か null）から、枠ごとのセル
 * - 同じ予約（=== で同じもの）が続く枠は、最初を booked（span は続く数）、残りを covered
 * - 予約が無く、枠の始まりが now 以前なら past、それ以外は free
 * - 始まった予約（now より前に始まった）も booked のまま（過ぎていても予約は見せる）
 */
export function gridCells<T>(slots: Slot[], busy: (T | null)[], now: Date): Cell<T>[] {
  // ここを書く
  throw new Error(`まだ書いていません（${slots.length} ${busy.length} ${now.toISOString()}）`);
}
