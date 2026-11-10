// 第20章 練習問題5 解答例: リクエストのボディを、大きさの上限付きで読む
import { HttpError } from './http-app.mjs';

const tooLarge = (limit) =>
  // 上限を超えたら、残りは受け取らずに接続を閉じる（Connection: close）。
  // 閉じないと Node.js は、次のリクエストのために、残りのボディを読んで捨てようとする
  new HttpError(413, `ボディが大きすぎます（上限 ${limit} バイト）`, { headers: { Connection: 'close' } });

/**
 * ボディを全部読んで Buffer で返す
 * @param {import('node:http').IncomingMessage} req
 * @param {{ limit?: number }} [options] limit はバイト数
 */
export function readBody(req, { limit = 1024 * 1024 } = {}) {
  // 先に申告された大きさで断れるなら、1バイトも読まずに断る
  const declared = req.headers['content-length'];
  if (declared !== undefined && Number(declared) > limit) return Promise.reject(tooLarge(limit));

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = (err, value) => {
      if (done) return;
      done = true;
      req.off('data', onData);
      if (err) reject(err);
      else resolve(value);
    };
    // for await で読んで途中で throw すると、req ごと接続が壊され、413 を返せなくなる（Node 26 で確かめた）。
    // そこで 'data' イベントで読み、上限を超えたら、読むのをやめる（pause）だけにする
    const onData = (chunk) => {
      size += chunk.length;
      if (size > limit) {
        req.pause();
        finish(tooLarge(limit));
        return;
      }
      chunks.push(chunk);
    };
    req.on('data', onData);
    req.once('end', () => finish(null, Buffer.concat(chunks, size))); // 文字に戻すのは、全部そろってから
    req.once('error', (err) => finish(err));
    req.once('close', () => {
      if (!req.complete) finish(new Error('客が、ボディを送り終える前に切りました'));
    });
  });
}

/** Content-Type を { type, params } に分ける。type と params の名前は小文字 */
export function mediaType(req) {
  const header = req.headers['content-type'];
  if (!header) return { type: '', params: {} };
  const [type, ...rest] = header.split(';');
  const params = {};
  for (const p of rest) {
    const i = p.indexOf('=');
    if (i === -1) continue;
    const name = p.slice(0, i).trim().toLowerCase();
    let value = p.slice(i + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    params[name] = value;
  }
  return { type: type.trim().toLowerCase(), params };
}

function requireType(req, accept, label) {
  const { type, params } = mediaType(req);
  if (!accept(type)) throw new HttpError(415, `Content-Type は ${label} にしてください`);
  const charset = params.charset?.toLowerCase();
  if (charset && charset !== 'utf-8' && charset !== 'utf8') throw new HttpError(415, '文字コードは UTF-8 にしてください');
}

const decoder = () => new TextDecoder('utf-8', { fatal: true }); // UTF-8 として正しくないバイト列は失敗させる

function toText(buf) {
  try {
    return decoder().decode(buf);
  } catch {
    throw new HttpError(400, 'UTF-8 として読めません');
  }
}

/** text/plain のボディを文字列で */
export async function readText(req, options) {
  requireType(req, (t) => t === 'text/plain', 'text/plain');
  return toText(await readBody(req, options));
}

/** JSON のボディ。application/json と、application/xxx+json を受け付ける */
export async function readJson(req, options) {
  requireType(req, (t) => t === 'application/json' || /^application\/[\w.+-]+\+json$/.test(t), 'application/json');
  const text = toText(await readBody(req, options));
  if (text.trim() === '') throw new HttpError(400, 'ボディが空です');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'JSON として読めません'); // 細かい理由（どこで失敗したか）は客に見せなくてよい
  }
}

/** HTML のフォーム（application/x-www-form-urlencoded）を URLSearchParams で */
export async function readForm(req, options) {
  requireType(req, (t) => t === 'application/x-www-form-urlencoded', 'application/x-www-form-urlencoded');
  return new URLSearchParams(toText(await readBody(req, options)));
}
