// 8.1節: 型と関数を export する
export type Status = 'todo' | 'doing' | 'done';

export type Task = {
  id: number;
  title: string;
  status: Status;
};

export function createTask(id: number, title: string): Task {
  return { id, title, status: 'todo' };
}
