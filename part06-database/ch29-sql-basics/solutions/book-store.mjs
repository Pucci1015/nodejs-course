// 練習問題5 の模範解答

export function addBook(db, { title, author, year, pages, genre }) {
  const r = db
    .prepare('INSERT INTO books (title, author, year, pages, genre) VALUES (?, ?, ?, ?, ?)')
    .run(title, author, year, pages, genre);
  return Number(r.lastInsertRowid);
}

export function findByAuthor(db, author) {
  return db
    .prepare('SELECT id, title, year FROM books WHERE author = ? ORDER BY year')
    .all(author)
    .map((row) => ({ ...row }));
}

export function markRead(db, id, date) {
  const r = db.prepare('UPDATE books SET read_at = ? WHERE id = ?').run(date, id);
  return r.changes === 1;
}

export function countUnread(db) {
  const { n } = db.prepare('SELECT count(*) AS n FROM books WHERE read_at IS NULL').get();
  return n;
}
