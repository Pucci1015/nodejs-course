// 練習問題8 の模範解答（buggy-report.mjs を直したもの）

export function unreadTitles(db) {
  // 修正: NULL は = では比べられない。IS NULL を使う
  return db.prepare('SELECT title FROM books WHERE read_at IS NULL ORDER BY id').all().map((r) => r.title);
}

export function newestFirst(db, limit) {
  // 修正: 新しい順は DESC。同じ年なら id の小さい順にして、並びを1つに決める
  return db.prepare('SELECT id, title, year FROM books ORDER BY year DESC, id LIMIT ?').all(limit).map((r) => ({ ...r }));
}

export function techOrScience(db, minPages) {
  // 修正: AND は OR より先に結びつくので、OR をかっこで囲む
  return db
    .prepare(`SELECT id FROM books WHERE (genre = 'tech' OR genre = 'science') AND pages >= ? ORDER BY id`)
    .all(minPages)
    .map((r) => r.id);
}

export function page(db, n, size) {
  // 修正: 1 ページ目は 0 行飛ばす。n ページ目は (n - 1) * size 行飛ばす
  return db
    .prepare('SELECT id FROM books ORDER BY id LIMIT ? OFFSET ?')
    .all(size, (n - 1) * size)
    .map((r) => r.id);
}

export function addBook(db, { title, author, year, pages, genre }) {
  const r = db
    .prepare('INSERT INTO books (title, author, year, pages, genre) VALUES (?, ?, ?, ?, ?)')
    .run(title, author, year, pages, genre); // 修正: 列の順（year, pages）に合わせて渡す
  return Number(r.lastInsertRowid);
}

export function markAuthorRead(db, author, date) {
  // 修正: WHERE が無いと、全部の行が変わる。その著者の、まだ読んでいない本だけにする
  return db.prepare('UPDATE books SET read_at = ? WHERE author = ? AND read_at IS NULL').run(date, author).changes;
}
