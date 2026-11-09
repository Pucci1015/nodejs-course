// kana-lib/romaji: ひらがな・カタカナ → ローマ字（ヘボン式のごく一部）
import { ROMAJI } from '#table'; // 修正: 内部の部品は "imports" の名前で読む（フォルダを動かしても package.json を直すだけで済む）
import { toHiragana } from './index.mjs';

export function toRomaji(text) {
  return Array.from(toHiragana(text), (ch) => ROMAJI.get(ch) ?? ch).join('');
}
