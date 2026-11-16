// 練習問題2: GROUP BY で数える・足す SELECT を、3つ書いてください。
// 要件は README にあります。
// 試す: node run-query.mjs group-queries.mjs minutesByUser
// 確かめ方: node --test group-queries.test.mjs

// 人ごとの、全部のタスクの数（タスクの無い人は出なくてよい）
export const countByUser = `
  -- ここを書く
`;

// 人ごとの、まだ終わっていない（todo か doing の）タスクの minutes の合計。タスクの無い人も 0 で
export const minutesByUser = `
  -- ここを書く
`;

// タグごとの、付いているタスクの数。2 つ以上のタスクに付いたタグだけ
export const popularTags = `
  -- ここを書く
`;
