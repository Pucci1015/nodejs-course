// 練習問題8 の模範解答
import { readFileSync } from 'node:fs';

export type Status = 'todo' | 'doing' | 'done';
export type Task = { id: number; title: string; status: Status; dueDate?: string };

const LABELS = { todo: '未着手', doing: '作業中', done: '完了' } as const;

function toStatus(text: string): Status | null {
  const s = text.trim().toLowerCase();
  if (s === 'todo' || s === 'doing' || s === 'done') return s;
  return null;
}

export function parseLine(line: string): Task | null {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return null;
  // 分けた結果は string[]。[0] などの型は string | undefined（noUncheckedIndexedAccess）
  const [idText, titleText, statusText, dueText] = trimmed.split(',');
  if (idText === undefined || titleText === undefined || statusText === undefined) return null;
  const id = Number(idText.trim());
  if (!Number.isInteger(id) || id < 1) return null; // Number('x') は NaN。NaN も 1.5 もここで落とす
  const title = titleText.trim();
  if (title === '') return null;
  const status = toStatus(statusText);
  if (status === null) return null;
  const task: Task = { id, title, status };
  const due = dueText?.trim() ?? ''; // 4つ目が無ければ undefined
  if (due !== '') task.dueDate = due;
  return task;
}

function formatTask(t: Task, today: string): string {
  const head = `#${t.id} [${LABELS[t.status]}] ${t.title}`;
  if (t.dueDate === undefined) return head;
  const overdue = t.status !== 'done' && t.dueDate < today;
  return `${head}（締め切り ${t.dueDate}${overdue ? '・過ぎています' : ''}）`;
}

export function formatReport(tasks: Task[], today: string): string {
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const t of tasks) counts[t.status] += 1;
  const lines = [`未着手 ${counts.todo} / 作業中 ${counts.doing} / 完了 ${counts.done}`];
  for (const t of tasks) lines.push(formatTask(t, today));
  return lines.join('\n');
}

if (import.meta.main) {
  // process.argv[2] の型は string | undefined。足りなければ使い方を出して終わる
  const [, , fileName, today] = process.argv;
  if (fileName === undefined || today === undefined) {
    console.error('使い方: node report.ts ファイル 今日の日付（YYYY-MM-DD）');
    process.exit(1);
  }
  const tasks: Task[] = [];
  const lines = readFileSync(fileName, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const task = parseLine(line);
    if (task !== null) tasks.push(task);
    // 空の行とコメントは黙って飛ばし、それ以外の読めない行だけ知らせる
    else if (line.trim() !== '' && !line.trim().startsWith('#')) console.error(`読めない行: ${i + 1}行目`);
  });
  console.log(formatReport(tasks, today));
}
