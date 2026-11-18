// 2.3節: わざと遅いハッシュ（scrypt・Argon2id）と、SHA-256 の時間を比べる
import { argon2, createHash, randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const argon2Async = promisify(argon2);
const salt = randomBytes(16);
const password = 'neko-daisuki';

async function time(label: string, fn: () => unknown) {
  const start = performance.now();
  await fn();
  console.log(`${label.padEnd(10)} ${(performance.now() - start).toFixed(1)} ms`);
}

await time('SHA-256', () => createHash('sha256').update(salt).update(password).digest());
// scrypt: N（計算の量とメモリ）を 2^15 にする。maxmem はメモリの上限（足りないとエラーになる）
// （promisify は、scrypt のように省略できる引数がある関数では、型がうまく付かないので、Promise を自分で作る）
await time('scrypt', () =>
  new Promise((resolve, reject) =>
    scrypt(password, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))),
  ),
);
// Argon2id: memory は KiB（19456 KiB = 19 MiB）、passes は繰り返しの回数（OWASP のおすすめの値）
await time('argon2id', () =>
  argon2Async('argon2id', { message: password, nonce: salt, memory: 19456, passes: 2, parallelism: 1, tagLength: 32 }),
);
