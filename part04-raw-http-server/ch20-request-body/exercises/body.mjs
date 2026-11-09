// 練習問題2: リクエストのボディを、大きさの上限付きで読む
// 仕様は README の練習問題2を見てください。
// 確かめる: node --test body.test.mjs
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

/** ボディを全部読んで Buffer で返す。limit はバイト数 */
export async function readBody(req, { limit = 1024 * 1024 } = {}) {
  // ここを書く（下は上限の無い、簡単な読み方です）
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Content-Type を { type, params } に分ける。type と params の名前は小文字 */
export function mediaType(req) {
  // ここを書く
  return { type: req.headers['content-type'] ?? '', params: {} };
}

/** text/plain のボディを文字列で */
export async function readText(req, options) {
  // ここを書く
  return (await readBody(req, options)).toString();
}

/** JSON のボディ。application/json と、application/xxx+json を受け付ける */
export async function readJson(req, options) {
  // ここを書く
  return JSON.parse((await readBody(req, options)).toString());
}

/** HTML のフォーム（application/x-www-form-urlencoded）を URLSearchParams で */
export async function readForm(req, options) {
  // ここを書く
  return new URLSearchParams((await readBody(req, options)).toString());
}
