// 第56章 6節: 外とやりとりする関数。送る処理（send）を引数で受け取るので、テストでは偽物を渡せる
import { daysUntil } from './due.ts';

export interface Task {
  id: number;
  title: string;
  status: 'todo' | 'doing' | 'done';
  dueDate: string | null;
}

export interface RemindDeps {
  now: Date;
  send: (task: Task) => Promise<void>;
}

/** 今日が期限で、まだ終わっていないタスクを知らせる。送れなかったものがあっても、残りは送る */
export async function remindDueToday(tasks: Task[], { now, send }: RemindDeps): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const task of tasks) {
    if (task.status === 'done' || task.dueDate === null) continue;
    if (daysUntil(task.dueDate, now) !== 0) continue;
    try {
      await send(task);
      sent++;
    } catch (err) {
      console.error(`送れませんでした: ${task.id}`, err);
      failed++;
    }
  }
  return { sent, failed };
}
