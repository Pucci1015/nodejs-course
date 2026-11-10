// 第22章 4.1節で書く、セッション ID の作り方を比べるプログラムの完成形
// 使い方（~/dev/part04/ch22-cookie-session で）: node samples/random-id.mjs   （サーバは使わない。動かすたびに違う値が出る）
import crypto from 'node:crypto';

console.log('Math.random     :', Math.random().toString(36).slice(2));

const id = crypto.randomBytes(32).toString('base64url');
console.log('randomBytes(32) :', id, `（${id.length} 文字）`);

console.log('randomUUID      :', crypto.randomUUID());
