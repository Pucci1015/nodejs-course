// 練習問題3 の模範解答

export const createIndexes = `
  CREATE INDEX tasks_user_id_status ON tasks (user_id, status);
  CREATE INDEX tasks_due_date ON tasks (due_date);
`;
