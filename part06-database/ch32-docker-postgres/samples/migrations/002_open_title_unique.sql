-- 2: 終わっていないタスクの中では、題名が重ならない
CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done';
