// 6.1節: JWT を作って、中を見て、確かめる
import { signJwt, verifyJwt } from './jwt.ts';

const SECRET = 'dev-only-jwt-secret-at-least-32-bytes!';
const token = signJwt({ sub: '1', email: 'alice@example.com' }, SECRET, { now: Date.UTC(2026, 10, 18, 9, 0, 0) });
console.log(token);

// 2つ目の部分は、鍵が無くても読める
const [, payload = ''] = token.split('.');
console.log(Buffer.from(payload, 'base64url').toString());

// 確かめる（期限の前）
console.log(verifyJwt(token, SECRET, { now: Date.UTC(2026, 10, 18, 9, 5, 0) }));

// 違う鍵・期限の後・中身を書き換えたもの
const tries: [string, () => unknown][] = [
  ['違う鍵', () => verifyJwt(token, 'dev-only-another-secret-32-bytes!!', { now: Date.UTC(2026, 10, 18, 9, 5, 0) })],
  ['期限の後', () => verifyJwt(token, SECRET, { now: Date.UTC(2026, 10, 18, 9, 20, 0) })],
  [
    '中身を書き換えた',
    () => {
      const [h, , s] = token.split('.');
      const changed = Buffer.from(JSON.stringify({ sub: '2', email: 'bob@example.com', exp: 9999999999 })).toString('base64url');
      return verifyJwt(`${h}.${changed}.${s}`, SECRET, { now: Date.UTC(2026, 10, 18, 9, 5, 0) });
    },
  ],
];
for (const [label, fn] of tries) {
  try {
    fn();
    console.log(label, '→ 通ってしまった');
  } catch (err) {
    console.log(label, '→', err instanceof Error ? err.message : err);
  }
}
