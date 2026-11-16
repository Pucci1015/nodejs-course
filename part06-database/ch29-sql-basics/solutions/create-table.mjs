// 練習問題3 の模範解答

export const createMembers = `
  CREATE TABLE members (
    id    INTEGER PRIMARY KEY,
    email TEXT    NOT NULL UNIQUE,
    name  TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
    age   INTEGER CHECK (age >= 0),
    plan  TEXT    NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'))
  )
`;
