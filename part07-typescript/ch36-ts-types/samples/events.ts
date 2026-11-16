// 2節: 判別できるユニオン。type という項目の値で、どの形かを見分ける
type Task = { id: number; title: string };

type TaskEvent =
  | { type: 'created'; task: Task }
  | { type: 'renamed'; id: number; from: string; to: string }
  | { type: 'deleted'; id: number };

function describe(e: TaskEvent): string {
  switch (e.type) {
    case 'created':
      return `作成: #${e.task.id} ${e.task.title}`; // ここでは e は created の形
    case 'renamed':
      return `題名の変更: #${e.id} ${e.from} → ${e.to}`;
    case 'deleted':
      return `削除: #${e.id}`;
    default:
      return assertNever(e); // ここに来ることは無い（来たら tsc がエラーにする）
  }
}

// never: 「値が1つも無い型」。全部の case を書いていれば、default の e は never になる
function assertNever(x: never): never {
  throw new Error(`知らないイベントです: ${JSON.stringify(x)}`);
}

const events: TaskEvent[] = [
  { type: 'created', task: { id: 1, title: '牛乳を買う' } },
  { type: 'renamed', id: 1, from: '牛乳を買う', to: '豆乳を買う' },
  { type: 'deleted', id: 1 },
];
for (const e of events) console.log(describe(e));
