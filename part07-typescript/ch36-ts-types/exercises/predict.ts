// 練習問題4: a〜h の変数の型を予想してから、エディタで確かめてください（README）
type Status = 'todo' | 'doing' | 'done';

const a = [1, 'one'];
const b = ['todo', 'done'] as const;
const c = { status: 'todo' };
let d = 'todo';
const e = 'todo';
const f = Math.random() > 0.5 ? 'yes' : null;
const g = [10, 20, 30].find((n) => n > 15);
const h = Object.keys({ todo: 1, done: 2 });

function setStatus(task: { status: Status }): void {
  console.log(task.status);
}
setStatus(c); // ← 問2

console.log(a, b, c, d, e, f, g, h);
