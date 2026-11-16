// 練習問題3: 一覧の検索条件（あるものだけ付ける）と並べ替えを、クエリビルダで組み立ててください。
// 要件は README にあります。この関数は async にせず、await する前のクエリを返します（テストが .toSQL() で中身を見るため）。
// 確かめ方: node --test list-query.test.mjs
import { and, asc, desc, eq, ilike, lt } from 'drizzle-orm';
import { tasks } from './schema.mjs';

// 並べ替えに使ってよい名前と、その列
const SORTABLE = {
  id: tasks.id,
  title: tasks.title,
  dueDate: tasks.dueDate,
  createdAt: tasks.createdAt,
};

export function listQuery(db, { status, q, dueBefore, sort = 'id', order = 'asc', limit = 20 } = {}) {
  // ここを書く
}
