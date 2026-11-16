// 3節: 型ガード。確かめる関数を作って、何度も使えるようにする
type Task = { id: number; title: string; done: boolean };

// 戻り値の型 value is Task: true を返したら、value は Task だと tsc に教える
function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'id' in value && typeof value.id === 'number' &&
    'title' in value && typeof value.title === 'string' &&
    'done' in value && typeof value.done === 'boolean'
  );
}

// asserts value is Task: 戻ってきたら value は Task。違えば投げる
function assertTask(value: unknown): asserts value is Task {
  if (!isTask(value)) throw new TypeError(`タスクの形ではありません: ${JSON.stringify(value)}`);
}

const data: unknown = JSON.parse('[{"id":1,"title":"牛乳を買う","done":false},{"id":"2","title":"本を返す"}]');
if (Array.isArray(data)) {
  const tasks = data.filter(isTask); // filter に型ガードを渡すと、結果は Task[] になる
  console.log(tasks.map((t) => t.title));
}

const one: unknown = JSON.parse('{"id":3,"title":"掃除","done":true}');
assertTask(one);
console.log(one.title, one.done); // ここでは one は Task

try {
  assertTask({ id: 4 });
} catch (err) {
  if (err instanceof Error) console.log(err.message);
}
