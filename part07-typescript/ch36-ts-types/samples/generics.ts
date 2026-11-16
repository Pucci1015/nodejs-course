// 4節: ジェネリクス。型を「引数」として受け取る関数と型
// <T> は「呼ぶときに決まる型」。first(['a']) なら T は string、first([1]) なら T は number
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const s = first(['牛乳', '本']); // string | undefined
const n = first([10, 20]); // number | undefined
console.log(s, n);

// K extends keyof T: K は T の項目の名前のどれか（keyof T は、項目の名前のユニオン）
// T[K] は「T の K の項目の型」
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

type Task = { id: number; title: string; done: boolean };
const tasks: Task[] = [
  { id: 1, title: '牛乳を買う', done: false },
  { id: 2, title: '本を返す', done: true },
];
const titles = pluck(tasks, 'title'); // string[]
const ids = pluck(tasks, 'id'); // number[]
console.log(titles, ids);

// 型にも引数を付けられる。Page<Task> は「Task のページ」
type Page<T> = { items: T[]; nextCursor: string | null };
const page: Page<Task> = { items: tasks, nextCursor: null };
console.log(page.items.length);

// extends で「こういう形のものだけ」と制限する
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
console.log(longest('ねこ', 'いぬねこ'), longest([1, 2], [3]));
