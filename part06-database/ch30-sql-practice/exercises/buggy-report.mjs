// 練習問題8: 集計の関数に、バグが 5 か所あります。README の仕様に合わせて直してください。
// 試す: node -e "import('./buggy-report.mjs').then(async (r) => console.log(r.tasksPerUser((await import('./tasks-db.mjs')).createTasksDb())))"
// 確かめ方: node --test buggy-report.test.mjs

// 全員の、タスクの数（タスクの無い人は 0）
export function tasksPerUser(db) {
  return db
    .prepare(`
      SELECT u.name, count(*) AS n
      FROM users AS u
      LEFT JOIN tasks AS t ON t.user_id = u.id
      GROUP BY u.id
      ORDER BY u.id
    `)
    .all()
    .map((r) => ({ ...r }));
}

// 全員の、終わっていないタスクの minutes の合計（無い人は 0）
export function openMinutes(db) {
  return db
    .prepare(`
      SELECT u.name, sum(t.minutes) AS minutes
      FROM users AS u
      LEFT JOIN tasks AS t ON t.user_id = u.id
      WHERE t.status <> 'done'
      GROUP BY u.id
      ORDER BY u.id
    `)
    .all()
    .map((r) => ({ ...r }));
}

// 終わっていないタスクが min 個以上ある人の名前
export function busyUsers(db, min) {
  return db
    .prepare(`
      SELECT u.name
      FROM users AS u
      JOIN tasks AS t ON t.user_id = u.id
      GROUP BY u.id
      HAVING t.status <> 'done' AND count(*) >= ?
      ORDER BY u.id
    `)
    .all(min)
    .map((r) => r.name);
}

// 人ごとの、タグが1つ以上付いたタスクの minutes の合計（そういうタスクがある人だけ）
export function taggedMinutes(db) {
  return db
    .prepare(`
      SELECT u.name, sum(t.minutes) AS minutes
      FROM users AS u
      JOIN tasks AS t ON t.user_id = u.id
      JOIN task_tags AS tt ON tt.task_id = t.id
      GROUP BY u.id
      ORDER BY u.id
    `)
    .all()
    .map((r) => ({ ...r }));
}
