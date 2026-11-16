// 練習問題6 の模範解答
export type Status = 'todo' | 'doing' | 'done';

export function label(status: Status): string {
  switch (status) {
    case 'todo':
      return '未着手';
    case 'doing':
      return '作業中';
    case 'done':
      return '完了';
  }
}

export function next(status: Status): Status {
  if (status === 'todo') return 'doing';
  return 'done'; // doing の次も、done の次も done
}

export function parseStatus(text: string): Status | null {
  const s = text.trim().toLowerCase();
  // s は string。=== で比べた後の return では、tsc は s をリテラル型として扱う（7節）
  if (s === 'todo' || s === 'doing' || s === 'done') return s;
  return null;
}

export function countByStatus(tasks: { status: Status }[]): { todo: number; doing: number; done: number } {
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const t of tasks) counts[t.status] += 1; // t.status は 3つのどれかなので、counts のキーとして使える
  return counts;
}
