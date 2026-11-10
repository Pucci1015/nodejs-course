// 問題9 解答例: 静的ファイルのサーバを、serveStatic（問題6）で書き直したもの
// 使い方: node static-server.mjs   → http://127.0.0.1:9195/   （公開するフォルダは ../samples/public）
//         node static-server.mjs フォルダ   → そのフォルダを公開する（自分の Mac の中だけで使う道具として）
import http from 'node:http';
import path from 'node:path';
import { createApp } from '../../ch17-minimal-server/solutions/app.mjs';
import { serveStatic } from './static.mjs';

const PORT = Number(process.env.PORT ?? 9195);
const ROOT = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '..', 'samples', 'public'));

const server = http.createServer(createApp(serveStatic(ROOT)));
server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（公開するフォルダ: ${ROOT}）`));
