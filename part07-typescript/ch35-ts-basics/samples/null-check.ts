// 5節: 無いかもしれない値（undefined・null）を扱う
type Task = { id: number; title: string; dueDate?: string };

const tasks: Task[] = [
  { id: 1, title: '牛乳を買う' },
  { id: 2, title: '本を返す', dueDate: '2026-11-20' },
];

// find は、見つからなければ undefined を返す。戻り値の型は Task | undefined
const found = tasks.find((t) => t.id === 3);
if (found === undefined) {
  console.log('id 3 はありません');
} else {
  console.log(found.title); // ここでは found は Task（undefined ではない）
}

// ?. は「undefined なら、そこで止めて undefined」。?? は「undefined か null なら、右の値」
const title = tasks.find((t) => t.id === 2)?.title ?? '（なし）';
console.log(title);

// 配列の [0] も、空なら undefined（noUncheckedIndexedAccess の設定。8節）
const first = tasks[0];
console.log(first?.title);

// 「無い」をわざと返す関数は、戻り値に | null を書く
function dueOf(task: Task): string | null {
  return task.dueDate ?? null;
}
console.log(dueOf(tasks[1]!)); // ! は「undefined ではない」と言い切る。間違っていたら実行時に壊れるので、なるべく使わない
