// 練習問題8: 本の一覧と更新の関数に、バグが 6 か所あります。README の仕様に合わせて直してください。
// 確かめ方: node --test buggy-report.test.mjs

export function unreadTitles(db) {
  return db.prepare('SELECT title FROM books WHERE read_at = NULL ORDER BY id').all().map((r) => r.title);
}

export function newestFirst(db, limit) {
  return db.prepare('SELECT id, title, year FROM books ORDER BY year LIMIT ?').all(limit).map((r) => ({ ...r }));
}

export function techOrScience(db, minPages) {
  return db
    .prepare(`SELECT id FROM books WHERE genre = 'tech' OR genre = 'science' AND pages >= ? ORDER BY id`)
    .all(minPages)
    .map((r) => r.id);
}

export function page(db, n, size) {
  return db
    .prepare('SELECT id FROM books ORDER BY id LIMIT ? OFFSET ?')
    .all(size, n * size)
    .map((r) => r.id);
}

export function addBook(db, { title, author, year, pages, genre }) {
  const r = db
    .prepare('INSERT INTO books (title, author, year, pages, genre) VALUES (?, ?, ?, ?, ?)')
    .run(title, author, pages, year, genre);
  return Number(r.lastInsertRowid);
}

export function markAuthorRead(db, author, date) {
  return db.prepare('UPDATE books SET read_at = ?').run(date).changes;
}
