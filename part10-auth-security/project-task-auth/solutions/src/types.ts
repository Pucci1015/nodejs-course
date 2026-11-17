// 追加（第7部）: タスクと、層と層の間でやりとりする形の型。データの層の形は interface で決める（第37章 4節）
// どの層もこのファイルの型を import する。このファイルは、ほかのファイルを import しない

export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number]; // 'todo' | 'doing' | 'done'（第36章 7節）

/** API が返すタスクの形（第5部の成果物と同じ） */
export type Task = {
  id: number;
  title: string;
  status: Status;
  dueDate: string | null; // 'YYYY-MM-DD'
  createdAt: string; // ISO 8601
  updatedAt: string;
  completedAt: string | null;
  version: number;
};

/** データの層に入れる・変える項目（id はデータベースが付ける） */
export type TaskFields = Omit<Task, 'id'>;

/** 並べ方（?sort=）。- が付いていれば大きい順 */
export const SORTS = ['createdAt', '-createdAt', 'dueDate', '-dueDate', 'title', '-title'] as const;
export type Sort = (typeof SORTS)[number];

/** カーソルが指す「前のページの最後」。v は並べ替えの値（日時・日付・題名の文字列か null） */
export type CursorPosition = { v: string | null; id: number };

/** 一覧の1ページを頼むときに渡すもの */
export type ListPageQuery = {
  statuses?: Status[] | undefined;
  dueBefore?: string | undefined;
  sort: Sort;
  limit: number;
  after?: CursorPosition | undefined;
};

export type Page<T> = { items: T[]; hasMore: boolean };

/** 版を確かめるときに渡すもの */
export type VersionCheck = { expectedVersion?: number | undefined };

/** データの層（タスク）の形。PostgreSQL でも、メモリでも、この形にそろえる */
export interface TaskRepo {
  listPage(q: ListPageQuery): Promise<Page<Task>>;
  /** 無ければ null */
  get(id: number): Promise<Task | null>;
  /** 終わっていないタスクのうち、題名が title のもの（exceptId のタスクは除く）。無ければ null */
  findOpenByTitle(title: string, exceptId?: number | null): Promise<Task | null>;
  countByStatus(status: Status): Promise<number>;
  insert(fields: TaskFields): Promise<Task>;
  /** expectedVersion が今の version と違えば（か、無ければ）null */
  update(id: number, fields: Partial<TaskFields>, options?: VersionCheck): Promise<Task | null>;
  /** 消したら true */
  remove(id: number, options?: VersionCheck): Promise<boolean>;
}

/** Idempotency-Key で覚える応答 */
export type StoredResponse = { status: number; headers: Record<string, string>; body: unknown };

/** 覚えているもの。status が running なら、まだ応答が無い */
export type IdempotencyRecord =
  | { fingerprint: string; status: 'running'; response?: null | undefined }
  | { fingerprint: string; status: 'done'; response: StoredResponse };

/** 冪等キーを覚える場所の形。メモリでも、データベースの表でも、この形にそろえる */
export interface IdempotencyStore {
  /** キーが無ければ running で覚えて null。あれば、覚えているもの */
  claim(key: string, fingerprint: string): Promise<IdempotencyRecord | null>;
  complete(key: string, response: StoredResponse): Promise<void>;
  delete(key: string): Promise<void>;
  /** 期限の切れたものを消す。消した数を返す */
  purgeExpired(): Promise<number>;
}

/** 起きたこと（SSE で配る） */
export type TaskEventType = 'task.created' | 'task.updated' | 'task.deleted';
export type Publish = (type: TaskEventType, task: Task) => void;
