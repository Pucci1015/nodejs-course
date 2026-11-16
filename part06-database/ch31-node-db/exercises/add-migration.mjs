// 練習問題3: 本文5節の MIGRATIONS の後ろに、手順を2つ足してください。
// 要件は README にあります。1〜3 と migrate は書き換えないこと。
// 確かめ方: node --test add-migration.test.mjs

// 並べた順に1回ずつ動かす。一度配った手順は書き換えず、変えたいときは後ろに足す
export const MIGRATIONS = [
  // 1: タスクのテーブル
  `CREATE TABLE tasks (
     id         INTEGER PRIMARY KEY,
     title      TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
     status     TEXT    NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
     due_date   TEXT,
     created_at TEXT    NOT NULL,
     updated_at TEXT    NOT NULL,
     version    INTEGER NOT NULL DEFAULT 1
   )`,
  // 2: 終わっていないタスクの中では、題名が重ならない
  `CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done'`,
  // 3: 終わった時刻の列を足す
  `ALTER TABLE tasks ADD COLUMN completed_at TEXT`,
  // 4: ここに足す（priority の列）
  // 5: ここに足す（status と due_date のインデックス）
];

// 今の版（PRAGMA user_version）より後の手順を、1つずつトランザクションの中で動かす
export function migrate(db, migrations = MIGRATIONS) {
  const from = db.prepare('PRAGMA user_version').get().user_version;
  for (let v = from; v < migrations.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(migrations[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`); // PRAGMA には ? が使えない。v は自分のコードの数なので、書き込んでよい
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`マイグレーション ${v + 1} に失敗しました: ${err.message}`, { cause: err });
    }
  }
  return { from, to: Math.max(from, migrations.length) };
}
