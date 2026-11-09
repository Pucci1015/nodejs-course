// node:http を使わず、node:net（TCP）の上で HTTP/1.1 を話す小さなサーバ（第6章 3〜9節）
// 届いたリクエストを「そのままのバイト」で見せるためのもの。本番で使うものではない。
// 使い方: node raw-http-server.mjs [ポート]   既定: 8080
//   別のターミナルで: curl -v http://localhost:8080/hello
//                    printf 'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n' | nc localhost 8080
import net from 'node:net';

const port = Number(process.argv[2] ?? 8080);
const HEADER_END = Buffer.from('\r\n\r\n');
const MAX_HEADER_BYTES = 16 * 1024; // ヘッダが大きすぎるリクエストは断る
let connectionCount = 0;

/** \r と \n を目に見える形にする（"\r\n" と表示してから改行する） */
function visualize(text) {
  return text.replaceAll('\r', '\\r').replaceAll('\n', '\\n\n');
}

/** ヘッダ部分（開始行 + ヘッダ）の文字列を解析する */
function parseHead(head) {
  const [requestLine, ...headerLines] = head.split('\r\n');
  const parts = requestLine.split(' ');
  if (parts.length !== 3 || !/^HTTP\/1\.[01]$/.test(parts[2])) return null;
  const [method, target, version] = parts;
  // ヘッダ名は大文字・小文字を区別しない（RFC 9110）。小文字にそろえて保存する
  const headers = {};
  for (const line of headerLines) {
    const colon = line.indexOf(':');
    if (colon <= 0) return null;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    headers[name] = headers[name] === undefined ? value : `${headers[name]}, ${value}`;
  }
  return { method, target, version, headers };
}

/** レスポンスを組み立てて送る。Content-Length は「バイト数」で数える */
function respond(socket, status, reason, body, { close = false, head = false, extraHeaders = {} } = {}) {
  const bodyBytes = Buffer.from(body, 'utf8');
  const lines = [
    `HTTP/1.1 ${status} ${reason}`,
    'Content-Type: text/plain; charset=utf-8',
    `Content-Length: ${bodyBytes.length}`,
    `Date: ${new Date().toUTCString()}`,
    ...Object.entries(extraHeaders).map(([k, v]) => `${k}: ${v}`),
  ];
  if (close) lines.push('Connection: close');
  socket.write(`${lines.join('\r\n')}\r\n\r\n`);
  // HEAD のときは、GET と同じヘッダ（Content-Length も）を返すが、ボディは送らない
  if (!head) socket.write(bodyBytes);
  if (close) socket.end();
}

net
  .createServer((socket) => {
    const id = ++connectionCount;
    let requestCount = 0;
    let pending = Buffer.alloc(0); // まだ処理していないバイト（TCP は区切りを持たない。第5章4.3節）
    console.log(`[接続 #${id}] ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      // 1回の 'data' に複数のリクエストが入っていることもあるので、処理できる限り繰り返す
      while (!socket.writableEnded) {
        const headerEnd = pending.indexOf(HEADER_END);
        if (headerEnd === -1) {
          if (pending.length > MAX_HEADER_BYTES) {
            respond(socket, 431, 'Request Header Fields Too Large', 'ヘッダが大きすぎます\n', { close: true });
          }
          return; // ヘッダの終わり（空行）がまだ届いていない
        }
        const head = pending.subarray(0, headerEnd).toString('latin1');
        const req = parseHead(head);
        if (!req) {
          respond(socket, 400, 'Bad Request', 'リクエストの形式が正しくありません\n', { close: true });
          return;
        }
        if (req.version === 'HTTP/1.1' && req.headers.host === undefined) {
          // HTTP/1.1 では Host ヘッダは必須
          respond(socket, 400, 'Bad Request', 'HTTP/1.1 では Host ヘッダが必要です\n', { close: true });
          return;
        }
        if (req.headers['transfer-encoding'] !== undefined) {
          respond(socket, 501, 'Not Implemented', 'このサーバは chunked のリクエストに対応していません\n', { close: true });
          return;
        }
        const length = Number(req.headers['content-length'] ?? 0);
        if (!Number.isInteger(length) || length < 0) {
          respond(socket, 400, 'Bad Request', 'Content-Length が正しくありません\n', { close: true });
          return;
        }
        const bodyStart = headerEnd + HEADER_END.length;
        if (pending.length < bodyStart + length) return; // ボディがまだ全部届いていない

        const body = pending.subarray(bodyStart, bodyStart + length);
        const raw = pending.subarray(0, bodyStart + length);
        pending = pending.subarray(bodyStart + length); // 残りは次のリクエストの始まり
        requestCount += 1;
        console.log(`[接続 #${id}] ${requestCount} 件目: ${req.method} ${req.target} ${req.version}`);

        // HTTP/1.1 は既定で接続を使い回す（keep-alive）。HTTP/1.0 は既定で閉じる
        const connection = (req.headers.connection ?? '').toLowerCase();
        const close = connection === 'close' || (req.version === 'HTTP/1.0' && connection !== 'keep-alive');

        const report = [
          `接続 #${id} の ${requestCount} 件目のリクエストです。`,
          '',
          '== 届いたバイトそのまま（\\r\\n が改行の記号）==',
          visualize(raw.toString('utf8')),
          '',
          '== 解析した結果 ==',
          `メソッド: ${req.method}`,
          `リクエストターゲット: ${req.target}`,
          `バージョン: ${req.version}`,
          `ヘッダ: ${JSON.stringify(req.headers, null, 2)}`,
          `ボディ: ${body.length} バイト ${JSON.stringify(body.toString('utf8'))}`,
          '',
        ].join('\n');
        respond(socket, 200, 'OK', report, { close, head: req.method === 'HEAD' });
      }
    });

    socket.on('end', () => console.log(`[切断 #${id}] ${requestCount} 件のリクエストを処理しました`));
    socket.on('error', (err) => console.log(`[エラー #${id}] ${err.code}`));
    // 何も送ってこない接続をいつまでも持たない
    socket.setTimeout(30_000, () => socket.destroy());
  })
  .listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/ で待ち受けています（Ctrl + C で終了）`));
