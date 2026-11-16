// 練習問題5: books テーブルを使う関数を、? を使って書いてください。
// 要件は README にあります。
// 確かめ方: node --test book-store.test.mjs

export function addBook(db, { title, author, year, pages, genre }) {
  // ここを書く（足した本の id を数で返す）
}

export function findByAuthor(db, author) {
  // ここを書く（[{ id, title, year }, …] を year の古い順に返す）
}

export function markRead(db, id, date) {
  // ここを書く（変えたら true、その id が無ければ false）
}

export function countUnread(db) {
  // ここを書く（未読の冊数を数で返す）
}
