// 練習問題7: タスクの API を呼ぶクライアントを、応答を Zod で確かめて書いてください。要件は README にあります。
// 確かめ方: node --test client.test.ts
import { z } from 'zod';

export const Status = z.enum(['todo', 'doing', 'done']);
// ここに Task のスキーマを書く

export type Status = z.infer<typeof Status>;
// ここに Task の型を書く（スキーマから作る）
export type NewTaskInput = { title: string; status?: Status; dueDate?: string | null };

export type UpstreamErrorKind = 'network' | 'status' | 'shape';

/** タスクの API が、思った応答を返さなかった */
export class UpstreamError extends Error {
  readonly kind: UpstreamErrorKind;
  readonly status: number | null;

  constructor(kind: UpstreamErrorKind, status: number | null, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UpstreamError';
    this.kind = kind;
    this.status = status;
  }
}

export function createTaskClient(baseUrl: string, fetchFn: typeof fetch = fetch) {
  // ここを書く。getTask・listTasks・createTask を持つオブジェクトを返す
  throw new Error('まだ書いていません');
}
