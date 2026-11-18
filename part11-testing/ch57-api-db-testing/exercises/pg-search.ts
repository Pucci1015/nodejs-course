// 練習問題6: 題名でタスクを探す SQL を書く
import type { Db } from './pg-repo.ts';
import type { Task } from './types.ts';

export async function searchTasks(db: Db, text: string): Promise<Task[]> {
  // ここを書く
  void db;
  void text;
  throw new Error('まだ書いていません');
}
