// 練習問題5: タスクにタグを付ける関数を3つ書いてください（多対多、トランザクション、配列）。
// 要件は README にあります。テストは TAGS_SQL（書いてあります）でテーブルを作ってから呼びます。
// 確かめ方: node --test task-tags.test.mjs
import { withTransaction } from './with-transaction.mjs';

export const TAGS_SQL = `
  CREATE TABLE tags (
    id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text    NOT NULL UNIQUE
  );
  CREATE TABLE task_tags (
    task_id integer NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    tag_id  integer NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
  );
`;

// タスク taskId のタグを、names（タグの名前の配列）に置き換える。無いタグは作る。付いたタグの名前を、名前の順に返す
export async function setTags(pool, taskId, names) {
  // ここを書く
}

// タスク taskId のタグの名前の配列（名前の順）
export async function tagsOf(pool, taskId) {
  // ここを書く
}

// 全部のタスクの { id, title, tags } の配列（id の順）。tags はタグの名前の配列（名前の順）。タグが無ければ []
export async function tasksWithTags(pool) {
  // ここを書く
}
