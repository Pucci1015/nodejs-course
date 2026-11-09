// 練習問題3: フォルダの中のファイルを返すハンドラ serveStatic
// 仕様は README の練習問題3を見てください。問題2の safe-path.mjs を使います。
// 確かめる: node --test static.test.mjs
import fs from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { contentType } from '../samples/mime.mjs';
import { resolveFile } from './safe-path.mjs';

export function serveStatic(root, { mount = '', index = 'index.html', cacheControl = 'no-cache' } = {}) {
  return async (req, res) => {
    // ここを書く（下は、ファイルを返すところまで。足りないところがたくさんあります）
    const { pathname } = new URL(`http://localhost${req.url}`);
    const found = await resolveFile(root, pathname, { index });
    if ('redirect' in found) {
      res.writeHead(308, { Location: found.redirect });
      res.end();
      return;
    }
    const stat = await fs.stat(found.path);
    res.writeHead(200, {
      'Content-Type': contentType(found.path),
      'Content-Length': stat.size,
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const fh = await fs.open(found.path);
    await pipeline(fh.createReadStream(), res);
  };
}
