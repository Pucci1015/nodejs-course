// 練習問題2: 並べ替えの指定（?sort=-dueDate など）を、ORDER BY の中身に直す関数を書いてください。
// 要件は README にあります。列の名前は ? で渡せないので、決めた中から選びます。
// 確かめ方: node --test order-by.test.mjs

export function orderByClause(sort) {
  // ここを書く（例: '-dueDate' → 'due_date DESC, id ASC'）
}

// orderByClause を使って、全部のタスクの id を、その順に返す
export function listIds(db, sort) {
  // ここを書く
}
