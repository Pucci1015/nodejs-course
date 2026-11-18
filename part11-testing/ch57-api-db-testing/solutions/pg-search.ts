// 練習問題6 の模範解答: 題名でタスクを探す
import type { Db } from '../exercises/pg-repo.ts';
import type { Status, Task } from '../exercises/types.ts';

interface Row {
  id: number;
  title: string;
  status: Status;
  due_date: string | null;
}

/** LIKE で特別な意味を持つ \ % _ の前に \ を付けて、ふつうの文字にする */
function escapeLike(text: string): string {
  return text.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

export async function searchTasks(db: Db, text: string): Promise<Task[]> {
  const words = text.trim();
  if (words === '') return [];
  // 値はプレースホルダ（$1）で渡す。' を含んでも SQL は壊れない（第6部 第31章）
  const { rows } = await db.query<Row>(
    `SELECT id, title, status, to_char(due_date, 'YYYY-MM-DD') AS due_date
       FROM tasks
      WHERE title ILIKE '%' || $1 || '%'
      ORDER BY id`,
    [escapeLike(words)],
  );
  return rows.map((row) => ({ id: row.id, title: row.title, status: row.status, dueDate: row.due_date }));
}
