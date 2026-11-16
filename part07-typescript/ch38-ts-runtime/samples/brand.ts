// 7節: ブランド型。同じ number でも、タスクの id と利用者の id を取り違えないようにする
import { z } from 'zod';

const TaskId = z.number().int().positive().brand<'TaskId'>();
const UserId = z.number().int().positive().brand<'UserId'>();
type TaskId = z.infer<typeof TaskId>; // number & z.$brand<'TaskId'>
type UserId = z.infer<typeof UserId>;

function assignTask(taskId: TaskId, userId: UserId): string {
  return `タスク ${taskId} を、利用者 ${userId} に割り当てました`;
}

const taskId = TaskId.parse(3); // 確かめて通った値だけが TaskId になる
const userId = UserId.parse(42);

console.log(assignTask(taskId, userId));
// @ts-expect-error 順番を取り違えると、tsc のエラーになる
console.log(assignTask(userId, taskId));
// @ts-expect-error ただの number も渡せない（確かめていないので）
console.log(assignTask(3, 42));
console.log(taskId + 1); // 計算には、ふつうの number として使える（結果はただの number）
