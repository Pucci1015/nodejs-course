// 練習問題2 の模範解答

export const COMMENTS_SQL = `
  CREATE TABLE comments (
    id         integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id    integer     NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    body       text        NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX comments_task_id_created_at ON comments (task_id, created_at);
`;
