// 8.1節: 別のファイルの型と関数を import する。型だけのものには type を付ける。拡張子は .ts と書く
import { createTask, type Task } from './task-model.ts';

const tasks: Task[] = [createTask(1, '牛乳を買う'), createTask(2, '本を返す')];
tasks[1]!.status = 'doing';
for (const t of tasks) console.log(`${t.id} ${t.title} [${t.status}]`);
