// Buffer: バイト列を扱う（第15章 6節）
// 使い方: node buffer-demo.mjs
import { StringDecoder } from 'node:string_decoder';

const hex = (buf) => [...buf].map((b) => b.toString(16).padStart(2, '0')).join(' ');

// 1. 文字列 ⇔ バイト列
const buf = Buffer.from('Aあ😀', 'utf8');
console.log('1. Buffer.from("Aあ😀"):', hex(buf), `（${buf.length} バイト）`);
console.log('   文字列の length:', 'Aあ😀'.length, '/ 文字の数:', [...'Aあ😀'].length);
console.log('   toString("utf8"):', buf.toString('utf8'));
console.log('   toString("base64"):', buf.toString('base64'), '/ hex:', buf.toString('hex'));

// 2. Buffer は Uint8Array。1つ1つは 0〜255 の数
console.log('2. buf[1]:', buf[1], '/ buf instanceof Uint8Array:', buf instanceof Uint8Array);
const copy = Buffer.alloc(3); // 0 で埋めた 3 バイト
copy[0] = 300; // 255 を超えると 256 で割った余り（300 → 44）
console.log('   alloc(3) に 300 を入れると:', [...copy]);

// 3. 途中で切れた UTF-8: チャンクごとに toString すると、文字が壊れる
const text = 'こんにちは';
const bytes = Buffer.from(text); // 1文字 3 バイト × 5 = 15 バイト
const chunks = [bytes.subarray(0, 4), bytes.subarray(4, 8), bytes.subarray(8)]; // わざと文字の途中で切る
console.log('3. チャンク:', chunks.map(hex));
console.log('   チャンクごとに toString:', chunks.map((c) => c.toString('utf8')).join(''));

// 4. 直し方1: 全部つなげてから toString（Buffer.concat）
console.log('4. Buffer.concat してから toString:', Buffer.concat(chunks).toString('utf8'));

// 5. 直し方2: StringDecoder / TextDecoder（stream: true）は、途中のバイトを次のチャンクまで持っておく
const sd = new StringDecoder('utf8');
console.log('5. StringDecoder:', chunks.map((c) => sd.write(c)).join('') + sd.end());
const td = new TextDecoder('utf-8');
console.log('   TextDecoder(stream: true):', chunks.map((c) => td.decode(c, { stream: true })).join('') + td.decode());

// 6. 比べる: 中身が同じでも === は false（別のオブジェクト）
const a = Buffer.from('secret');
const b = Buffer.from('secret');
console.log('6. a === b:', a === b, '/ a.equals(b):', a.equals(b), '/ Buffer.compare(a, b):', Buffer.compare(a, b));
