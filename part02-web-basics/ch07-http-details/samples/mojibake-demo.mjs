// 文字化けがどうして起きるのかを、バイト列で確かめる（第7章 2節）
// 使い方: node mojibake-demo.mjs [文字列]   既定: こんにちは
import { encodeShiftJis } from './sjis.mjs';

const text = process.argv[2] ?? 'こんにちは';
const hex = (buf) => [...buf].map((b) => b.toString(16).padStart(2, '0')).join(' ');

const encoded = {
  'UTF-8': Buffer.from(text, 'utf8'),
  Shift_JIS: encodeShiftJis(text),
};

for (const [name, bytes] of Object.entries(encoded)) {
  console.log(`「${text}」を ${name} で書いたバイト列（${bytes.length} バイト）: ${hex(bytes)}`);
  for (const reader of ['utf-8', 'shift_jis', 'euc-jp', 'windows-1252']) {
    const shown = new TextDecoder(reader).decode(bytes);
    const mark = reader.replace('-', '').toLowerCase() === name.replace('-', '').toLowerCase() ? '  ← 正しい組み合わせ' : '';
    console.log(`  ${reader.padEnd(12)} として読む: ${shown}${mark}`);
  }
  console.log();
}
