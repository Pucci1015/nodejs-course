// 4.1節: タスクの型と、データの層（リポジトリ）の形
export type Status = 'todo' | 'doing' | 'done';

export type Task = {
  id: number;
  title: string;
  status: Status;
  createdAt: string;
};

export type NewTask = Pick<Task, 'title'> & Partial<Pick<Task, 'status'>>;

/** データの層の形。メモリでも PostgreSQL でも、この形にそろえる */
export interface TaskRepo {
  list(filter?: { status?: Status }): Promise<Task[]>;
  get(id: number): Promise<Task | null>;
  create(input: NewTask): Promise<Task>;
  remove(id: number): Promise<boolean>;
}
