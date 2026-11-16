// 練習問題6 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { countByStatus, label, next, parseStatus, type Status } from './status.ts';

export type Checks = [
  Expect<Equal<Status, 'todo' | 'doing' | 'done'>>,
  Expect<Equal<Parameters<typeof label>, [status: Status]>>,
  Expect<Equal<ReturnType<typeof label>, string>>,
  Expect<Equal<Parameters<typeof next>, [status: Status]>>,
  Expect<Equal<ReturnType<typeof next>, Status>>,
  Expect<Equal<Parameters<typeof parseStatus>, [text: string]>>,
  Expect<Equal<ReturnType<typeof parseStatus>, Status | null>>,
  Expect<Equal<Parameters<typeof countByStatus>, [tasks: { status: Status }[]]>>,
  Expect<Equal<ReturnType<typeof countByStatus>, { todo: number; doing: number; done: number }>>,
];

// @ts-expect-error 3つ以外の文字列は渡せない
label('waiting');
// @ts-expect-error parseStatus の戻り値は null かもしれないので、そのままは渡せない
label(parseStatus('todo'));
// タスクの形をしていれば、ほかの項目があってもよい
countByStatus([{ status: 'todo' }]);
const tasks = [{ id: 1, status: 'doing' as const }];
countByStatus(tasks);
