// 第44章 練習問題で使う型（書き換えなくてよい）
export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];
