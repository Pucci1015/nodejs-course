// 練習問題7の模範解答: WebSocket のハンドシェイクを確かめ、フレームを読み書きする（RFC 6455）
import crypto from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** Sec-WebSocket-Accept の値 */
export const computeAccept = (key) => crypto.createHash('sha1').update(key + GUID).digest('base64');

/** 'keep-alive, Upgrade' のようなカンマ区切りのヘッダに、その言葉（大文字・小文字を区別しない）があるか */
const hasToken = (value, token) =>
  String(value ?? '')
    .split(',')
    .some((t) => t.trim().toLowerCase() === token);

/**
 * @param {{ method: string, headers: Record<string, string | undefined> }} req
 * @param {{ allowedOrigins: string[], allowNoOrigin?: boolean, protocols?: string[] }} options
 * @returns {{ ok: true, headers: Record<string, string> } | { ok: false, status: number, headers?: Record<string, string>, reason: string }}
 */
export function checkHandshake(req, { allowedOrigins, allowNoOrigin = false, protocols = [] }) {
  const h = req.headers;
  if (req.method !== 'GET') return { ok: false, status: 400, reason: 'GET だけ' };
  // 修正: Connection は「keep-alive, Upgrade」のように並ぶことがある。完全一致で比べない
  if (!hasToken(h.upgrade, 'websocket') || !hasToken(h.connection, 'upgrade')) return { ok: false, status: 400, reason: 'Upgrade・Connection' };
  // 追加: 知らない版には 426 と、分かる版（13）を知らせる
  if (h['sec-websocket-version'] !== '13') return { ok: false, status: 426, headers: { 'Sec-WebSocket-Version': '13' }, reason: '版' };
  // 追加: 鍵は「16 バイトを base64 にしたもの」（24 文字で == で終わる）
  const key = h['sec-websocket-key'];
  if (typeof key !== 'string' || !/^[A-Za-z0-9+/]{22}==$/.test(key) || Buffer.from(key, 'base64').length !== 16) {
    return { ok: false, status: 400, reason: 'Sec-WebSocket-Key' };
  }
  // 追加: WebSocket には CORS が無いので、Origin を自分で確かめる（ほかのサイトのページからの接続を断る）
  const origin = h.origin;
  if (origin === undefined ? !allowNoOrigin : !allowedOrigins.includes(origin)) return { ok: false, status: 403, reason: 'Origin' };

  const headers = { Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Accept': computeAccept(key) };
  // 追加: 客が出したサブプロトコルのうち、サーバが分かる最初のもの。分かるものが無ければ付けない
  const offered = String(h['sec-websocket-protocol'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const chosen = offered.find((p) => protocols.includes(p));
  if (chosen) headers['Sec-WebSocket-Protocol'] = chosen;
  return { ok: true, headers };
}

/**
 * フレームを作る
 * @param {number} opcode 1: 文字、2: バイナリ、8: 閉じる、9: ping、10: pong
 * @param {Buffer} payload
 * @param {{ mask?: Buffer }} [options] 客から送るときは 4 バイトの mask が必要
 */
export function encodeFrame(opcode, payload, { mask } = {}) {
  const len = payload.length;
  // 修正: 長さは 125 まで1バイト、65535 まで 126 + 2 バイト、それより長ければ 127 + 8 バイト
  const ext = len < 126 ? 0 : len < 65536 ? 2 : 8;
  const head = Buffer.alloc(2 + ext + (mask ? 4 : 0));
  head[0] = 0x80 | opcode; // FIN（これで終わり）
  head[1] = (mask ? 0x80 : 0) | (ext === 0 ? len : ext === 2 ? 126 : 127);
  if (ext === 2) head.writeUInt16BE(len, 2);
  if (ext === 8) head.writeBigUInt64BE(BigInt(len), 2);
  if (!mask) return Buffer.concat([head, payload]);
  mask.copy(head, 2 + ext);
  const body = Buffer.from(payload);
  for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4];
  return Buffer.concat([head, body]);
}

/**
 * buf の先頭から1つのフレームを読む。まだ全部届いていなければ null
 * @returns {{ fin: boolean, opcode: number, payload: Buffer, size: number } | null}  size は読んだバイト数
 */
export function decodeFrame(buf, { maxPayload = 1024 * 1024 } = {}) {
  if (buf.length < 2) return null;
  const fin = (buf[0] & 0x80) !== 0;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let len = buf[1] & 0x7f;
  let offset = 2;
  if (len === 126) {
    if (buf.length < 4) return null;
    len = buf.readUInt16BE(2);
    offset = 4;
  } else if (len === 127) {
    if (buf.length < 10) return null;
    const big = buf.readBigUInt64BE(2);
    if (big > BigInt(maxPayload)) throw new RangeError('フレームが大きすぎます');
    len = Number(big);
    offset = 10;
  }
  // 追加: 読む前に大きさを確かめる（大きな長さだけを送られて、メモリを使い切らないように）
  if (len > maxPayload) throw new RangeError('フレームが大きすぎます');
  const maskOffset = offset;
  if (masked) offset += 4;
  if (buf.length < offset + len) return null; // 修正: まだ届いていない。次の data を待つ
  const payload = Buffer.from(buf.subarray(offset, offset + len));
  if (masked) for (let i = 0; i < len; i++) payload[i] ^= buf[maskOffset + (i % 4)];
  return { fin, opcode, payload, size: offset + len };
}
