// パスワードのハッシュ（第22章 6.1節）。salt 付きの scrypt
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const KEYLEN = 32;

/** 保存する形: { salt, hash }（どちらも base64url の文字列。JSON に入れられるように） */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN);
  return { salt: salt.toString('base64url'), hash: hash.toString('base64url') };
}

let dummy; // 無いユーザーのときに使う、ダミーのハッシュ（最初に使うときに作る）

/** user が null でも、同じだけ時間をかけてから false を返す */
export async function verifyPassword(user, password) {
  dummy ??= await hashPassword('dummy-password');
  const { salt, hash } = user ?? dummy;
  const actual = await scrypt(password, Buffer.from(salt, 'base64url'), KEYLEN);
  const ok = crypto.timingSafeEqual(actual, Buffer.from(hash, 'base64url'));
  return ok && user !== null;
}
