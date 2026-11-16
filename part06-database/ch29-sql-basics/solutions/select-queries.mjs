// 練習問題1 の模範解答

export const unread = `
  SELECT title FROM books
  WHERE read_at IS NULL
  ORDER BY title
`;

export const recent = `
  SELECT title, year FROM books
  WHERE year >= 2020
  ORDER BY year DESC
  LIMIT 3
`;

export const aboutSql = `
  SELECT id, title FROM books
  WHERE title LIKE '%SQL%'
  ORDER BY id
`;

export const thickTech = `
  SELECT title, pages FROM books
  WHERE genre = 'tech' AND pages >= 300
  ORDER BY pages DESC
`;
