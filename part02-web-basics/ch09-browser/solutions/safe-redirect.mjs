// 練習問題8 の模範解答: ?next=... の値を、同じサイトの中のパスだけに制限する（オープンリダイレクト対策）
// 確かめ方（~/dev/ch09/exercises で）: MODULE=../solutions/safe-redirect.mjs node --test safe-redirect.test.mjs

// どこにも存在しない基準のオリジン。相対 URL を解決するためだけに使う
// （.invalid は、決して実在しないと決められたドメイン）
const BASE = 'https://base.invalid';

/**
 * @param {unknown} next
 * @param {string} [fallback]
 * @returns {string}
 */
export function safeRedirectPath(next, fallback = '/') {
  if (typeof next !== 'string') return fallback;
  // 文字列の見た目で判断せず、ブラウザと同じ規則（WHATWG URL）で解釈してから判断する。
  // \ を / として扱う、タブや改行を取り除く、などをブラウザと同じように行ってくれる
  let url;
  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }
  // 解釈した結果が基準のオリジンのままなら、「同じサイトの中」。
  // //evil.example や https://evil.example や javascript: は、ここで弾かれる
  if (url.origin !== BASE) return fallback;
  // 'tasks' のような相対パスも、基準の一番上に解決されて同じオリジンになるが、
  // 意図が分かりにくいので、/ で始まるものだけを受け付ける
  if (!next.trimStart().startsWith('/')) return fallback;
  return url.pathname + url.search + url.hash;
}
