// 練習問題4: WebSocket のハンドシェイクを確かめ、フレームを読み書きする（RFC 6455）
// 要件は exercises/README.md の問題4です。確かめ方:
//   $ node --test ws-protocol.test.mjs
// 今のひな形は、サンプルの ws-handshake-demo.mjs と同じく、ふつうの小さな場合しか考えていません。
import crypto from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export const computeAccept = (key) => crypto.createHash('sha1').update(key + GUID).digest('base64');

export function checkHandshake(req, { allowedOrigins, allowNoOrigin = false, protocols = [] }) {
  const h = req.headers;
  // ここを書く: Connection の並び、版、鍵の形、Origin、サブプロトコル
  if (h.upgrade !== 'websocket' || h.connection !== 'Upgrade') return { ok: false, status: 400, reason: 'Upgrade・Connection' };
  return { ok: true, headers: { Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Accept': computeAccept(h['sec-websocket-key']) } };
}

export function encodeFrame(opcode, payload, { mask } = {}) {
  // ここを書く: 126 バイト以上、mask
  return Buffer.concat([Buffer.from([0x80 | opcode, payload.length]), payload]);
}

export function decodeFrame(buf, { maxPayload = 1024 * 1024 } = {}) {
  // ここを書く: 126・127 の長さ、まだ届いていないとき、大きすぎるとき
  const opcode = buf[0] & 0x0f;
  const len = buf[1] & 0x7f;
  const mask = buf.subarray(2, 6);
  const payload = Buffer.from(buf.subarray(6, 6 + len));
  for (let i = 0; i < len; i++) payload[i] ^= mask[i % 4];
  return { fin: true, opcode, payload, size: 6 + len };
}
