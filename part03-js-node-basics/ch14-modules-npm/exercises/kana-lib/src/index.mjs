// kana-lib の入り口: ひらがな ⇔ カタカナ
import { KANA_OFFSET } from './internal/table.mjs';

export function toKatakana(text) {
  return text.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + KANA_OFFSET));
}

export function toHiragana(text) {
  return text.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - KANA_OFFSET));
}
