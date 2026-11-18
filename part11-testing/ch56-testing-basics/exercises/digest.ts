// 練習問題5 で確かめる関数（正しい実装）。書き換えないでください
// 人ごとに「3日以内が期限の、終わっていないタスク」を数え、1つでもあれば、その人に1通だけ知らせる

export interface User {
  id: number;
  email: string;
}

export interface Task {
  id: number;
  status: 'todo' | 'doing' | 'done';
  dueDate: string | null;
}

export interface DigestDeps {
  now: Date;
  listTasks: (userId: number) => Promise<Task[]>;
  send: (to: string, count: number) => Promise<void>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 知らせられなかった人の id の配列を返す */
export async function sendDigest(users: User[], { now, listTasks, send }: DigestDeps): Promise<number[]> {
  const today = Date.parse(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(now));
  const failed: number[] = [];
  for (const user of users) {
    const tasks = await listTasks(user.id);
    const count = tasks.filter((task) => {
      if (task.status === 'done' || task.dueDate === null) return false;
      const days = (Date.parse(task.dueDate) - today) / DAY_MS;
      return days <= 3; // 過ぎているものも含める
    }).length;
    if (count === 0) continue;
    try {
      await send(user.email, count);
    } catch {
      failed.push(user.id);
    }
  }
  return failed;
}
