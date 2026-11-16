// 0節: bug.mjs に型を付けたもの。tsc が、動かす前に2つの間違いを見つける（このファイルは、わざと直していない）
type Task = { id: number; title: string; done: boolean };

const task: Task = { id: 1, title: '牛乳を買う', done: false };

function label(t: Task): string {
  return `${t.id}: ${t.titel}`; // titel は title の打ち間違い
}

function addDays(dateText: string, days: number): string {
  const d = new Date(dateText);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

console.log(label(task));
console.log(addDays('2026-11-11', '3')); // 3 ではなく '3'（文字列）を渡した
