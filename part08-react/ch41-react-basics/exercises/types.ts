// 第41章の練習問題で使う型（solutions/types.ts と同じ。書き換えなくてよい）
export type Status = 'todo' | 'doing' | 'done';
export type Task = { id: number; title: string; status: Status; dueDate: string | null };
