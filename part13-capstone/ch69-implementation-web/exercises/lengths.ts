// 第69章 練習問題1: 予約のダイアログの「長さ」の選択肢（本文 4.1節）
import { RULES } from './domain/booking-rules.ts';
import { hhmm } from './domain/time.ts';

/**
 * 始まり（0 時からの分）から選べる長さ（分）を、短い順に全部
 * - RULES.minMinutes（30）から RULES.maxMinutes（180）まで、RULES.slotMinutes（30）ずつ
 * - 終わりが RULES.closeMinutes（21:00）を過ぎるものは入れない
 */
export function lengthsFrom(startMinutes: number): number[] {
  // ここを書く
  void [RULES, hhmm];
  throw new Error(`まだ書いていません（${startMinutes}）`);
}

/** 長さ（分）を '30 分'・'1 時間'・'1 時間 30 分' のように */
export function lengthLabel(minutes: number): string {
  // ここを書く
  throw new Error(`まだ書いていません（${minutes}）`);
}

/** 選択肢の文字: '1 時間 30 分（〜15:30）' */
export function optionLabel(startMinutes: number, minutes: number): string {
  // ここを書く
  throw new Error(`まだ書いていません（${startMinutes} ${minutes}）`);
}
