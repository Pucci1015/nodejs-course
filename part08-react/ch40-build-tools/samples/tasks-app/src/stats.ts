// 第40章 7節: 「集計を見る」を押したときだけ読み込むファイル（ビルドすると、別のファイルに分かれる）
import type { Task } from './api.ts';

export function summarize(tasks: Task[]): string {
  const count = (s: Task['status']) => tasks.filter((t) => t.status === s).length;
  return `未着手 ${count('todo')} / 作業中 ${count('doing')} / 完了 ${count('done')}`;
}
