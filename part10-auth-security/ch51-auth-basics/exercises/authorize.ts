// 第51章 練習問題7: 共有されたタスクの認可（本文7節）
export type Role = 'member' | 'admin';
export type User = { id: number; role: Role };
export type Task = { id: number; ownerId: number; sharedWith: number[]; locked: boolean };
export type Action = 'read' | 'update' | 'delete' | 'share';

/** してよければ true */
export function can(user: User, action: Action, task: Task): boolean {
  // ここを書く
  throw new Error(`まだ書いていません: ${user.id} ${action} ${task.id}`);
}

/** 無い・見えないなら 404、見えるが操作できないなら 403、できるなら 200 */
export function statusFor(user: User, action: Action, task: Task | undefined): 200 | 403 | 404 {
  // ここを書く
  throw new Error(`まだ書いていません: ${user.id} ${action} ${task?.id}`);
}
