// 練習問題2: books テーブルを変える INSERT・UPDATE・DELETE を、4つ書いてください。
// 要件は README にあります。
// 試す: node run-query.mjs change-queries.mjs markRead
// 確かめ方: node --test change-queries.test.mjs

// 新しい本を1冊足す
export const addBook = `
  -- ここを書く
`;

// id が 2 の本の read_at を '2026-11-01' にする
export const markRead = `
  -- ここを書く
`;

// 読み終わっていて（read_at が NULL でない）、rating が NULL の本の rating を 3 にする
export const rateRead = `
  -- ここを書く
`;

// 1990 年より前に出た本を消す
export const removeOld = `
  -- ここを書く
`;
