// 第10部の道具: 練習用の小さな SMTP サーバ（Mailpit の代わり。第53章）
// 成果物のテストが使うコピー（第10部の tools/ から。中身は同じ）。テストの中で起動するので、npm run mail と同じものを別に動かさなくてよい
// 受け取ったメールをメモリに覚えて、HTTP で JSON にして見せる。どこへも送らない（外にメールは出ない）
// 動かし方（~/dev/part10 で）: npm run mail   → SMTP 127.0.0.1:1025、見る所 http://127.0.0.1:8025/api/messages
// 中身は読まなくてよい（第53章 2節の SMTP の会話と、MIME の読み方の小さな実装）
import http from 'node:http';
import net from 'node:net';
import type { AddressInfo } from 'node:net';

export type ReceivedMail = {
  id: number;
  /** MAIL FROM で受け取った差出人（封筒の差出人） */
  from: string;
  /** RCPT TO で受け取った宛先（封筒の宛先） */
  to: string[];
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
  raw: string;
  receivedAt: string;
};

export type FakeSmtpOptions = { host?: string; smtpPort?: number; httpPort?: number; log?: (line: string) => void };

/** 練習のための決まった宛先。この宛先には、わざと失敗の応答を返す（第53章 3.3節） */
const TEMP_FAIL = 'temp-fail@example.com'; // 451（一時的な失敗。後でやり直せば届くかもしれない）
const PERM_FAIL = 'no-such-user@example.com'; // 550（ずっと失敗。やり直しても届かない）

export async function startFakeSmtp({
  host = '127.0.0.1',
  smtpPort = 1025,
  httpPort = 8025,
  log,
}: FakeSmtpOptions = {}) {
  const messages: ReceivedMail[] = [];
  let nextId = 1;

  const smtp = net.createServer((socket) => {
    socket.setEncoding('utf8');
    let buffer = '';
    let from: string | null = null;
    let to: string[] = [];
    let dataLines: string[] | null = null; // DATA の後、本文を受け取っている間だけ配列
    const reply = (line: string) => {
      log?.(`S: ${line}`);
      socket.write(`${line}\r\n`);
    };
    const reset = () => {
      from = null;
      to = [];
      dataLines = null;
    };

    reply('220 fake-smtp ESMTP（練習用。どこへも送りません）');

    socket.on('data', (chunk: string) => {
      buffer += chunk;
      let end: number;
      // 決まりでは行の終わりは CRLF（\r\n）。nc などから LF だけで来ても読めるようにする
      while ((end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, end).replace(/\r$/, '');
        buffer = buffer.slice(end + 1);
        if (dataLines !== null) {
          if (line === '.') {
            const raw = dataLines.join('\r\n');
            messages.unshift({
              id: nextId++,
              from: from ?? '',
              to,
              ...parseMessage(raw),
              raw,
              receivedAt: new Date().toISOString(),
            });
            log?.(`（${to.join(', ')} あてのメールを受け取りました）`);
            reset();
            reply('250 2.0.0 OK: queued');
          } else {
            // 行の頭の . は、送る側が .. にしている（ドットの詰め物）ので、1つ取る
            dataLines.push(line.startsWith('..') ? line.slice(1) : line);
          }
          continue;
        }
        log?.(`C: ${line}`);
        const verb = line.slice(0, 4).toUpperCase();
        const arg = line.slice(4).trim();
        if (verb === 'EHLO') {
          reply('250-fake-smtp');
          reply('250-8BITMIME');
          reply('250-SMTPUTF8');
          reply('250 SIZE 10485760');
        } else if (verb === 'HELO') {
          reply('250 fake-smtp');
        } else if (verb === 'MAIL') {
          from = angle(arg);
          to = [];
          reply('250 2.1.0 OK');
        } else if (verb === 'RCPT') {
          if (from === null) {
            reply('503 5.5.1 MAIL FROM が先です');
            continue;
          }
          const address = angle(arg);
          if (address.toLowerCase() === TEMP_FAIL) reply('451 4.3.0 いまは受け取れません。後でやり直してください');
          else if (address.toLowerCase() === PERM_FAIL) reply('550 5.1.1 そのような宛先はありません');
          else {
            to.push(address);
            reply('250 2.1.5 OK');
          }
        } else if (verb === 'DATA') {
          if (to.length === 0) {
            reply('503 5.5.1 RCPT TO が先です');
            continue;
          }
          dataLines = [];
          reply('354 本文を送ってください。最後は . だけの行');
        } else if (verb === 'RSET') {
          reset();
          reply('250 2.0.0 OK');
        } else if (verb === 'NOOP') {
          reply('250 2.0.0 OK');
        } else if (verb === 'QUIT') {
          reply('221 2.0.0 Bye');
          socket.end();
        } else {
          reply('502 5.5.2 知らないコマンドです');
        }
      }
    });
    socket.on('error', () => socket.destroy());
  });

  const web = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (url.pathname === '/api/messages' && req.method === 'GET') {
      // ?full=1 のときだけ、ヘッダと元のテキスト（raw）も見せる
      const full = url.searchParams.get('full') === '1';
      const list = full ? messages : messages.map(({ headers: _h, raw: _r, ...rest }) => rest);
      res.end(JSON.stringify(list, null, 2));
    } else if (url.pathname === '/api/messages' && req.method === 'DELETE') {
      messages.length = 0;
      res.statusCode = 204;
      res.end();
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ detail: 'GET /api/messages（?full=1 でヘッダも）か DELETE /api/messages' }));
    }
  });

  await Promise.all([listen(smtp, smtpPort, host), listen(web, httpPort, host)]);
  return {
    smtpPort: (smtp.address() as AddressInfo).port,
    httpPort: (web.address() as AddressInfo).port,
    messages,
    clear: () => {
      messages.length = 0;
    },
    close: async () => {
      web.closeAllConnections();
      await Promise.all([close(smtp), close(web)]);
    },
  };
}

function listen(server: net.Server, port: number, host: string) {
  return new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });
}

function close(server: net.Server) {
  return new Promise<void>((resolve) => server.close(() => resolve()));
}

/** `<alice@example.com>` や `FROM:<alice@example.com> SIZE=100` から、アドレスだけを取り出す */
function angle(arg: string): string {
  const m = /<([^>]*)>/.exec(arg);
  return m?.[1] ?? arg.replace(/^(?:FROM|TO):/i, ''); // 変更（第11部）: 取り出さないかっこ.trim();
}

/** ヘッダと本文に分けて、件名・テキスト・HTML を読む（よく使う形だけ。MIME の全部ではない） */
function parseMessage(raw: string): Pick<ReceivedMail, 'subject' | 'text' | 'html' | 'headers'> {
  const { headers, body } = splitHeaders(raw);
  const result = { subject: decodeWords(headers.subject ?? ''), text: '', html: '', headers };
  collectParts(headers, body, result);
  return result;
}

function splitHeaders(raw: string) {
  const at = raw.indexOf('\r\n\r\n');
  const head = at === -1 ? raw : raw.slice(0, at);
  const body = at === -1 ? '' : raw.slice(at + 4);
  const headers: Record<string, string> = {};
  // 空白で始まる行は、前の行の続き（折り返し）
  for (const line of head.replace(/\r\n[ \t]+/g, ' ').split('\r\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
  }
  return { headers, body };
}

function collectParts(headers: Record<string, string>, body: string, out: { text: string; html: string }) {
  const type = (headers['content-type'] ?? 'text/plain').toLowerCase();
  const boundary = /boundary="?([^";]+)"?/i.exec(headers['content-type'] ?? '')?.[1];
  if (type.startsWith('multipart/') && boundary !== undefined) {
    const parts = body.split(`--${boundary}`).slice(1);
    for (const part of parts) {
      if (part.startsWith('--')) break; // 終わりの印
      const p = splitHeaders(part.replace(/^\r\n/, ''));
      collectParts(p.headers, p.body.replace(/\r\n$/, ''), out);
    }
    return;
  }
  const decoded = decodeBody(body, headers['content-transfer-encoding'] ?? '7bit').replaceAll('\r\n', '\n');
  if (type.startsWith('text/html')) out.html ||= decoded;
  else if (type.startsWith('text/plain')) out.text ||= decoded;
}

function decodeBody(body: string, encoding: string): string {
  const enc = encoding.toLowerCase();
  if (enc === 'base64') return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
  if (enc === 'quoted-printable') return quotedPrintable(body.replace(/=\r\n/g, ''));
  return body;
}

/** =E3=81=AD のような書き方を、バイトに戻してから UTF-8 として読む */
function quotedPrintable(text: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const hex = text.slice(i + 1, i + 3);
    if (text[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(...Buffer.from(text[i] ?? '', 'utf8'));
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

/** 件名の =?UTF-8?B?…?= や =?UTF-8?Q?…?= を読む */
function decodeWords(value: string): string {
  return value
    .replace(/\?=\s+=\?/g, '?==?')
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_m, _charset: string, kind: string, data: string) =>
      kind.toUpperCase() === 'B'
        ? Buffer.from(data, 'base64').toString('utf8')
        : quotedPrintable(data.replaceAll('_', ' ')),
    );
}

if (import.meta.main) {
  const smtpPort = Number(process.env.SMTP_PORT ?? 1025);
  const httpPort = Number(process.env.HTTP_PORT ?? 8025);
  const quiet = process.env.QUIET === '1';
  // 追加（第12部）: 待ち受けるアドレスを HOST で変えられる（コンテナの中では 0.0.0.0）
  const host = process.env.HOST ?? '127.0.0.1';
  const server = await startFakeSmtp({
    host,
    smtpPort,
    httpPort,
    log: quiet ? undefined : (line) => console.log(line),
  });
  console.log(`練習用の SMTP サーバ: ${host}:${server.smtpPort}`);
  console.log(`受け取ったメール:   http://${host}:${server.httpPort}/api/messages`);
  console.log('Ctrl+C で止めます（メールは消えます）');
}
