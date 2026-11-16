// 4節: オブジェクトの形に名前を付ける（type と interface）
type Task = {
  readonly id: number; // readonly: 作った後で書き換えられない
  title: string;
  done: boolean;
  dueDate?: string; // ?: 無くてもよい項目（あれば string）
};

// interface でも、ほぼ同じことが書ける
interface User {
  name: string;
  email: string;
}

const t1: Task = { id: 1, title: '牛乳を買う', done: false };
const t2: Task = { id: 2, title: '本を返す', done: false, dueDate: '2026-11-20' };

function describe(task: Task): string {
  // dueDate は string か undefined。?? で「無いとき」の値を決める（5節）
  return `#${task.id} ${task.title}（締め切り: ${task.dueDate ?? 'なし'}）`;
}

console.log(describe(t1));
console.log(describe(t2));

// 形が同じなら、別の場所で作ったオブジェクトでも渡せる（名前ではなく形で比べる）
const fromSomewhere = { id: 3, title: '掃除', done: true, memo: '台所' };
console.log(describe(fromSomewhere));

const owner: User = { name: 'alice', email: 'alice@example.com' };
console.log(owner.name);
