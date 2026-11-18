// ミュータント: 数が 0 の人にも送る
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
    try {
      await send(user.email, count);
    } catch {
      failed.push(user.id);
    }
  }
  return failed;
}
