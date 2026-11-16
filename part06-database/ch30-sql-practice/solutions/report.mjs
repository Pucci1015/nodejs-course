// 練習問題8 の模範解答: buggy-report.mjs の 5 か所を直したもの
// 確かめ方（exercises で）: MODULE=../solutions/report.mjs node --test buggy-report.test.mjs

// 直した所1: LEFT JOIN で相手が無い行も、count(*) は 1 と数える。t.id を数える（NULL は数えない）
export function tasksPerUser(db) {
  return db
    .prepare(`
      SELECT u.name, count(t.id) AS n
      FROM users AS u
      LEFT JOIN tasks AS t ON t.user_id = u.id
      GROUP BY u.id
      ORDER BY u.id
    `)
    .all()
    .map((r) => ({ ...r }));
}

// 直した所2: WHERE で t の列を絞ると、t が NULL の行（dave）が消える。条件を ON に移す
// 直した所3: 足すものが無いと sum は NULL。coalesce で 0 にする
export function openMinutes(db) {
  return db
    .prepare(`
      SELECT u.name, coalesce(sum(t.minutes), 0) AS minutes
      FROM users AS u
      LEFT JOIN tasks AS t ON t.user_id = u.id AND t.status <> 'done'
      GROUP BY u.id
      ORDER BY u.id
    `)
    .all()
    .map((r) => ({ ...r }));
}

// 直した所4: 1行ずつの条件は WHERE（まとめる前）、まとめた結果の条件は HAVING（まとめた後）
export function busyUsers(db, min) {
  return db
    .prepare(`
      SELECT u.name
      FROM users AS u
      JOIN tasks AS t ON t.user_id = u.id
      WHERE t.status <> 'done'
      GROUP BY u.id
      HAVING count(*) >= ?
      ORDER BY u.id
    `)
    .all(min)
    .map((r) => r.name);
}

// 直した所5: task_tags と JOIN すると、タグが2つのタスクは2行になり、minutes を2回足す。
// 「タグがあるか」は IN（サブクエリ）で調べ、行を増やさない
export function taggedMinutes(db) {
  return db
    .prepare(`
      SELECT u.name, sum(t.minutes) AS minutes
      FROM users AS u
      JOIN tasks AS t ON t.user_id = u.id
      WHERE t.id IN (SELECT task_id FROM task_tags)
      GROUP BY u.id
      ORDER BY u.id
    `)
    .all()
    .map((r) => ({ ...r }));
}
