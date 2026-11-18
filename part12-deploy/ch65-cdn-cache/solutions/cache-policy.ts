// 第65章 練習問題1: 応答の種類ごとに、Cache-Control を決める（本文 4.1節）

const HASHED = /[.-][A-Za-z0-9_-]{8}\.(js|css|woff2|png|svg)$/;

/** method・pathname・status から、付ける Cache-Control を返す */
export function cacheControlFor(method: string, pathname: string, status: number): string {
  // 1. 書き換え・エラー・200 と 304 以外は、覚えさせない
  if (method !== 'GET' && method !== 'HEAD') return 'no-store';
  if (status !== 200 && status !== 304) return 'no-store';
  // 2. ハッシュ付きのファイルは 1 年
  if (pathname.startsWith('/assets/')) {
    return HASHED.test(pathname) ? 'public, max-age=31536000, immutable' : 'public, max-age=0';
  }
  // 3. API: 公開のものだけ CDN に。ほかは人ごとの応答として扱う
  if (pathname.startsWith('/api/public/')) return 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
  if (pathname === '/api' || pathname.startsWith('/api/')) return 'private, no-store';
  // 4. 拡張子の無いパスは画面（index.html）。毎回確かめる
  const last = pathname.split('/').at(-1) ?? '';
  if (!last.includes('.')) return 'no-cache';
  // 5. 名前の変わらないファイル
  return 'public, max-age=0';
}
