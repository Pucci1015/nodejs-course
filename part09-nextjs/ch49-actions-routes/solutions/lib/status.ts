// 第49章 3.4節: タスクの状態。サーバでもブラウザでも使う（lib/api.ts と違い server-only ではない）
export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<Status, string> = { todo: '未着手', doing: '作業中', done: '完了' };

export const isStatus = (v: unknown): v is Status => typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
