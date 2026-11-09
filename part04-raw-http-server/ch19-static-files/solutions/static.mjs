// 問題3 解答例: フォルダの中のファイルを返すハンドラ serveStatic
// router.get('/static/*', serveStatic(root, { mount: '/static' })) のように使う
import fs from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { contentType } from '../samples/mime.mjs';
import { parseRange } from './range.mjs';
import { resolveFile } from './safe-path.mjs';

/** ファイルの大きさと更新時刻から作る、弱い ETag */
export const makeEtag = (stat) => `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;

/** If-None-Match に、この ETag が入っているか（弱い比較: W/ を無視して比べる） */
function etagMatches(header, etag) {
  if (header.trim() === '*') return true;
  const strip = (t) => t.trim().replace(/^W\//, '');
  return header.split(',').some((t) => strip(t) === strip(etag));
}

/** 変わっていないので 304 を返してよいか */
function notModified(req, etag, mtime) {
  const inm = req.headers['if-none-match'];
  if (inm !== undefined) return etagMatches(inm, etag); // If-None-Match があれば、If-Modified-Since は見ない
  const ims = req.headers['if-modified-since'];
  if (ims === undefined) return false;
  const since = Date.parse(ims);
  // HTTP の日付は秒まで。ファイルの時刻のミリ秒を切り捨てて比べる
  return !Number.isNaN(since) && Math.floor(mtime.getTime() / 1000) * 1000 <= since;
}

/**
 * @param {string} root 公開するフォルダ
 * @param {{ mount?: string, index?: string, cacheControl?: string | ((file: string) => string), range?: boolean }} [options]
 */
export function serveStatic(root, { mount = '', index = 'index.html', cacheControl = 'no-cache', range = true } = {}) {
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      throw new HttpError(405, 'このメソッドは使えません', { headers: { Allow: 'GET, HEAD' } });
    }
    // Router が %xx を戻した params['*'] は使わない（2回戻すことになる）。%xx のままのパスから作る
    const pathname = req.pathname ?? new URL(`http://localhost${req.url}`).pathname;
    if (!pathname.startsWith(`${mount}/`)) throw new HttpError(404, 'ありません');
    const urlPath = pathname.slice(mount.length);

    const found = await resolveFile(root, urlPath, { index });
    if ('redirect' in found) {
      const search = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      res.writeHead(308, { Location: mount + found.redirect + search, 'Content-Length': 0 });
      res.end();
      return;
    }

    // 先に開いてから、開いたファイルの stat を使う。stat してから開く間に、ファイルが変わっても困らないように
    let fh;
    try {
      fh = await fs.open(found.path, 'r');
    } catch (err) {
      if (err.code === 'ENOENT') throw new HttpError(404, 'ありません');
      throw err;
    }
    try {
      const stat = await fh.stat();
      const etag = makeEtag(stat);
      const headers = {
        'Content-Type': contentType(found.path),
        'Last-Modified': stat.mtime.toUTCString(),
        ETag: etag,
        'Cache-Control': typeof cacheControl === 'function' ? cacheControl(found.path) : cacheControl,
        'X-Content-Type-Options': 'nosniff', // Content-Type を信じて、中身から推測しないでもらう
      };
      if (range) headers['Accept-Ranges'] = 'bytes';

      if (notModified(req, etag, stat.mtime)) {
        delete headers['Content-Type'];
        res.writeHead(304, headers);
        res.end();
        return;
      }

      let status = 200;
      let start = 0;
      let end = stat.size - 1;
      const r = range ? parseRange(req.headers.range, stat.size) : null;
      if (r === 'unsatisfiable') {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}`, 'Content-Length': 0 });
        res.end();
        return;
      }
      if (r) {
        status = 206;
        ({ start, end } = r);
        headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      }
      headers['Content-Length'] = stat.size === 0 ? 0 : end - start + 1;
      res.writeHead(status, headers);

      if (req.method === 'HEAD' || stat.size === 0) {
        res.end();
        return;
      }
      // 大きなファイルでも、少しずつ流す（第3部 第15章7節）。客が途中で切ったら、読むのも止まる
      await pipeline(fh.createReadStream({ start, end, autoClose: false }), res);
    } catch (err) {
      if (res.headersSent) {
        res.destroy(); // 途中で失敗した。切って知らせる
        return;
      }
      throw err;
    } finally {
      await fh.close();
    }
  };
}
