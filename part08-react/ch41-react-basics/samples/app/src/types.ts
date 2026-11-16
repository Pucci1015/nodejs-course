// 第41章 3節: この章の画面で使うタスクの型（API はまだ使わない。第43章でつなぐ）
export type Status = 'todo' | 'doing' | 'done';
export type Task = { id: number; title: string; status: Status; dueDate: string | null };
