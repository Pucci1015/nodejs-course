// 追加（第10部）: 第51章 3節の password.ts のコピー。パスワードを Argon2id の PHC 文字列にし、確かめる
// 保存する形: $argon2id$v=19$m=19456,t=2,p=1$<ソルト>$<ハッシュ>
import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const argon2Async = promisify(argon2);

/** 計算の重さ。m はメモリ（KiB）、t は繰り返しの回数、p は並列の数（OWASP のおすすめの値） */
export const PARAMS = { m: 19456, t: 2, p: 1 };

type Params = { m: number; t: number; p: number };

/** PHC 文字列の中の base64 は、最後の = を付けない */
const b64 = (buf: Buffer) => buf.toString('base64').replace(/=+$/, '');

function derive(password: string, salt: Buffer, params: Params): Promise<Buffer> {
  return argon2Async('argon2id', {
    message: password,
    nonce: salt,
    memory: params.m,
    passes: params.t,
    parallelism: params.p,
    tagLength: 32,
  });
}

/** パスワードを PHC 文字列にする。同じパスワードでも、毎回違う文字列になる（ソルトが毎回違うので） */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, PARAMS);
  return `$argon2id$v=19$m=${PARAMS.m},t=${PARAMS.t},p=${PARAMS.p}$${b64(salt)}$${b64(hash)}`;
}

const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

/** PHC 文字列とパスワードが合うか。形がおかしい文字列なら false */
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const m = PHC.exec(stored);
  if (m === null) return false;
  const params = { m: Number(m[1]), t: Number(m[2]), p: Number(m[3]) };
  const salt = Buffer.from(m[4] ?? '', 'base64');
  const expected = Buffer.from(m[5] ?? '', 'base64');
  const actual = await derive(password, salt, params);
  // 長さが違うと timingSafeEqual は例外を投げるので、先に比べる。比べる時間は、どこまで合っているかによらない
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** 無いユーザーでも、同じだけ時間をかけるためのハッシュ（だれも使わないパスワードから作る。第51章 5節） */
let dummy: Promise<string> | undefined;
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword('dev-only-dummy-password-for-timing');
  return dummy;
}
