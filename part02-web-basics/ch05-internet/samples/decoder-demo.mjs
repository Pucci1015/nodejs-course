// 日本語の文字がバイトの途中で分かれたときに、文字化けする様子と、その直し方（第5章 4.4節）
// 使い方: node decoder-demo.mjs
import { StringDecoder } from 'node:string_decoder';

const bytes = Buffer.from('こんにちは'); // 文字列を UTF-8 のバイト列にする
console.log(`「こんにちは」は ${bytes.length} バイト`);

// 4バイト目で2つに分ける（「こ」の3バイト + 「ん」の1バイト目 / 残り）
const part1 = bytes.subarray(0, 4);
const part2 = bytes.subarray(4);

console.log('(1) 1つずつ toString() すると:');
console.log(`  ${part1.toString()} / ${part2.toString()}`);

console.log('(2) StringDecoder を通すと:');
const decoder = new StringDecoder('utf8');
console.log(`  ${decoder.write(part1)} / ${decoder.write(part2)}`);
