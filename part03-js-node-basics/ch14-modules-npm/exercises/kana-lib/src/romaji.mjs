// kana-lib/romaji: ひらがな・カタカナ → ローマ字（ヘボン式のごく一部）
import { ROMAJI } from './internal/table.mjs';
import { toHiragana } from './index.mjs';

export function toRomaji(text) {
  return Array.from(toHiragana(text), (ch) => ROMAJI.get(ch) ?? ch).join('');
}
