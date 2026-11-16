// 練習問題1: 値を ? で渡して、タスクを探す関数を4つ書いてください。
// 要件は README にあります。SQL の文字列に、値を `${…}` で書き込まないこと。
// 確かめ方: node --test find-tasks.test.mjs

// status が同じタスクの title の配列（id の順）
export function findByStatus(db, status) {
  // ここを書く
}

// title に word を含むタスクの { id, title } の配列（id の順）
export function searchTitle(db, word) {
  // ここを書く
}

// due_date が from 以上 to 以下のタスクの id の配列（due_date の順、同じなら id の順）
export function dueBetween(db, from, to) {
  // ここを書く
}

// 終わっていなくて、due_date が date より前のタスクの title の配列（due_date の順に、limit 個まで）。$date と $limit の名前で渡す
export function overdue(db, { date, limit }) {
  // ここを書く
}
