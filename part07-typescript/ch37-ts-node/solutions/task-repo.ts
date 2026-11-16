// 練習問題3・5・6・8 で使う、タスクとデータの層（リポジトリ）の型。書き換えなくてよいファイル
export type Status = 'todo' | 'doing' | 'done';

export type Task = {
  id: number;
  title: string;
  status: Status;
  dueDate: string | null; // 'YYYY-MM-DD'
  createdAt: string; // ISO 8601（'2026-11-11T09:00:00.000Z'）
  updatedAt: string;
  version: number;
};

/** 作るときに渡すもの。status と dueDate は省略できる（'todo' と null になる） */
export type NewTask = { title: string; status?: Status; dueDate?: string | null };

/** 変えるときに渡すもの。渡した項目だけ変える */
export type TaskPatch = Partial<Pick<Task, 'title' | 'status' | 'dueDate'>>;

/** 一覧の絞り込み。dueBefore は「締め切りがこの日より前」（締め切りの無いものは入らない） */
export type TaskFilter = { status?: Status; dueBefore?: string };

/** データの層の形。メモリでも PostgreSQL でも、この形にそろえる */
export interface TaskRepo {
  /** id の小さい順 */
  list(filter?: TaskFilter): Promise<Task[]>;
  /** 無ければ null */
  get(id: number): Promise<Task | null>;
  create(input: NewTask): Promise<Task>;
  /** 無いか、expectedVersion が今の version と違えば null。変えたら version を 1 増やし、updatedAt を今に */
  update(id: number, patch: TaskPatch, options?: { expectedVersion?: number }): Promise<Task | null>;
  /** 消したら true、無ければ false */
  remove(id: number): Promise<boolean>;
}
