// 練習問題2 の模範解答

export const addBook = `
  INSERT INTO books (title, author, year, pages, genre)
  VALUES ('庭づくり', 'eve', 2026, 150, 'hobby')
`;

export const markRead = `
  UPDATE books SET read_at = '2026-11-01'
  WHERE id = 2
`;

export const rateRead = `
  UPDATE books SET rating = 3
  WHERE read_at IS NOT NULL AND rating IS NULL
`;

export const removeOld = `
  DELETE FROM books
  WHERE year < 1990
`;
