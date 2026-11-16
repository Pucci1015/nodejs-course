// 練習問題1: PostgreSQL に $1 で値を渡して、タスクを探す関数を4つ書いてください。
// 要件は README にあります。どの関数も async で、pool.query を使います。
// 確かめ方: node --test pg-queries.test.mjs

// status が同じタスクの title の配列（id の順）
export async function findByStatus(pool, status) {
  // ここを書く
}

// title に word を含むタスクの { id, title } の配列（id の順）。英字の大文字と小文字は区別しない
export async function searchTitle(pool, word) {
  // ここを書く
}

// status ごとの数。{ todo: 数, doing: 数, done: 数 }（数は number。無い status も 0）
export async function countByStatus(pool) {
  // ここを書く
}

// 終わっていなくて、due_date が date より前のタスクの title の配列（due_date の順に、limit 個まで）
export async function overdue(pool, { date, limit }) {
  // ここを書く
}
