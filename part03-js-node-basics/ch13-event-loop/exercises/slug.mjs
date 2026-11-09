// 練習問題5: この正規表現は、ある入力でイベントループを何秒も止めます（ReDoS）。
// 同じ文字列を受け付けて、どんな入力でもすぐに終わるように直してください。
// 確かめ方: node redos-measure.mjs       （長さごとの時間を測る）
//           node --test slug.test.mjs
//
// スラッグ（slug）は、URL に使う短い名前です。例: /posts/hello-world-2026 の「hello-world-2026」
//   - 使える文字は、英小文字・数字・ハイフン
//   - ハイフンは、英数字と英数字の間にだけ1つ置ける（先頭・末尾・2つ続けるのはだめ）
//   - 長さは 1〜100 文字

const SLUG = /^([a-z0-9]+-?)*[a-z0-9]+$/;

export function isValidSlug(s) {
  return typeof s === 'string' && s.length <= 100 && SLUG.test(s);
}
