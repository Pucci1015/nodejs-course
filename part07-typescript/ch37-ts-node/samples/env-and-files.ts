// 3節: Node.js の API の型。process.env と readFile
import { readFile } from 'node:fs/promises';

// 環境変数は、無いかもしれないので string | undefined
const portText = process.env.PORT;
const port = portText === undefined ? 9470 : Number(portText);
console.log('port:', port);

// 文字コードを渡すと string、渡さないと Buffer（バイトの並び）が返る。型も、それに合わせて変わる
const text = await readFile(import.meta.filename, 'utf8');
const bytes = await readFile(import.meta.filename);
console.log('行の数:', text.split('\n').length, 'バイト数:', bytes.length);

// process.argv は string[]。[2] は string | undefined
const name = process.argv[2] ?? '名無し';
console.log(`こんにちは、${name}さん`);
