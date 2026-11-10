// 練習問題6: バイトのチャンクを、1行ずつの文字列にする Transform を作ってください。
// 要件は README と lines.test.mjs にあります（node:readline は使わずに作ります）。
// 確かめ方: node --test lines.test.mjs
import { Transform } from 'node:stream';

/**
 * @param {{ maxLineLength?: number }} [options]  1行の長さ（文字数）の上限。既定は 1048576
 * @returns {Transform}  書く側: バイト（Buffer）、読む側: 1行ずつの文字列（改行は含まない）
 */
export function createLineSplitter({ maxLineLength = 1024 * 1024 } = {}) {
  // ここを書く
}
