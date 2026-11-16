// 練習問題5: タスクにタグを付ける関数を3つ、Drizzle で書いてください（第32章の練習問題5の Drizzle 版）。
// 要件は README にあります。テストの表には、最初からタグ「家」「急ぎ」があり、タスク 2・3 に「家」、5 に「急ぎ」が付いています。
// 確かめ方: node --test task-tags.test.mjs
import { asc, eq, inArray } from 'drizzle-orm';
import { tags, taskTags, tasks } from './schema.mjs';

// タスク taskId のタグを、names（タグの名前の配列）に置き換える。無いタグは作る。付いたタグの名前を、名前の順に返す
export async function setTags(db, taskId, names) {
  // ここを書く
}

// タスク taskId のタグの名前の配列（名前の順）
export async function tagsOf(db, taskId) {
  // ここを書く
}

// 全部のタスクの { id, title, tags } の配列（id の順）。tags はタグの名前の配列（名前の順）。SQL は 2 回まで
export async function tasksWithTags(db) {
  // ここを書く
}
