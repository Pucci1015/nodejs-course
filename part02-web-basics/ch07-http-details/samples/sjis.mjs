// 文字列を Shift_JIS のバイト列にする小さな関数（第7章 2節）
// Node.js の TextDecoder は Shift_JIS を「読む」ことはできるが、「書く」（TextEncoder）は UTF-8 しかできない。
// そこで、Shift_JIS の2バイト文字の範囲をすべて読んでみて、「文字 → バイト」の表を逆に作る。
// 外部のパッケージ（iconv-lite など）を使わずに文字化けの実験をするためのもので、実用には iconv-lite などを使う。

const decoder = new TextDecoder('shift_jis');
const table = new Map();

// 2バイト文字の1バイト目は 0x81〜0x9F と 0xE0〜0xFC、2バイト目は 0x40〜0xFC（0x7F を除く）
for (const lead of [...range(0x81, 0x9f), ...range(0xe0, 0xfc)]) {
  for (const trail of range(0x40, 0xfc)) {
    if (trail === 0x7f) continue;
    const ch = decoder.decode(Uint8Array.of(lead, trail));
    if (ch.length === 1 && ch !== '�' && !table.has(ch)) table.set(ch, [lead, trail]);
  }
}
// 1バイトの半角カタカナ（0xA1〜0xDF）
for (const b of range(0xa1, 0xdf)) table.set(decoder.decode(Uint8Array.of(b)), [b]);

function* range(from, to) {
  for (let i = from; i <= to; i++) yield i;
}

/** 文字列を Shift_JIS の Buffer にする。表せない文字は ? にする */
export function encodeShiftJis(text) {
  const bytes = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code < 0x80) bytes.push(code);
    else bytes.push(...(table.get(ch) ?? [0x3f]));
  }
  return Buffer.from(bytes);
}
