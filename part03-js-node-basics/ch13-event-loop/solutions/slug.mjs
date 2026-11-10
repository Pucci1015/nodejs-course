// 練習問題6 の解答: バックトラックが爆発しない正規表現にしたもの
// 確かめ方: cd ../exercises && node redos-measure.mjs ../solutions/slug.mjs
//           MODULE=../solutions/slug.mjs node --test slug.test.mjs

// 修正: 「英数字の並び」のあとに「ハイフン + 英数字の並び」が0回以上。
//       どの文字も、どの部分に当てはまるかが1通りに決まるので、失敗するときもすぐに分かる
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(s) {
  // 長さを先に確かめるのも大事。正規表現にかける前に、長すぎる入力を断れる
  return typeof s === 'string' && s.length <= 100 && SLUG.test(s);
}
