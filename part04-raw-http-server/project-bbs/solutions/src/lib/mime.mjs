// 拡張子から Content-Type を決める（第19章 3節。練習問題と模範解答でも使う）
import path from 'node:path';

// よく使うものだけ。もっと必要なら、IANA の一覧（参考資料）を見て足す
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
};

/** ファイルのパスから Content-Type。知らない拡張子は application/octet-stream（「ただのバイト列」。ブラウザはダウンロードする） */
export function contentType(file) {
  return TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/** 圧縮すると小さくなる種類か（文字のファイル）。画像や動画は、もう圧縮されている */
export function isCompressible(type) {
  return /^text\/|^application\/(json|javascript|xml)|^image\/svg\+xml/.test(type);
}
