// 第57章: 練習用の小さなタスクの API の型（第7部の成果物を小さくしたもの）

export type Status = 'todo' | 'doing' | 'done';

export interface Task {
  id: number;
  title: string;
  status: Status;
  dueDate: string | null; // 'YYYY-MM-DD'
}

export interface NewTask {
  title: string;
  dueDate: string | null;
}

/** データの置き場所の形。メモリの偽物（memory-repo.ts）と PostgreSQL（pg-repo.ts）が、同じ形を持つ */
export interface TaskRepo {
  /** id の順に、全部 */
  list(): Promise<Task[]>;
  /** 無ければ undefined */
  get(id: number): Promise<Task | undefined>;
  /** 終わっていない、同じ題名のタスクがあれば ConflictError */
  insert(input: NewTask): Promise<Task>;
  /** 無ければ undefined */
  setStatus(id: number, status: Status): Promise<Task | undefined>;
  /** 消したら true、無ければ false */
  remove(id: number): Promise<boolean>;
  countByStatus(status: Status): Promise<number>;
}

/** 決まりに合わない（サービスの決まり・データの置き場所の一意の決まり） */
export class ConflictError extends Error {
  override name = 'ConflictError';
}

/** 入力が決まりに合わない */
export class ValidationError extends Error {
  override name = 'ValidationError';
  readonly pointer: string;
  constructor(pointer: string, message: string) {
    super(message);
    this.pointer = pointer;
  }
}
