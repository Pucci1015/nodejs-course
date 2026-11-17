// 第51章 練習問題7 の模範解答: 共有されたタスクの認可
export type Role = 'member' | 'admin';
export type User = { id: number; role: Role };
export type Task = { id: number; ownerId: number; sharedWith: number[]; locked: boolean };
export type Action = 'read' | 'update' | 'delete' | 'share';

export function can(user: User, action: Action, task: Task): boolean {
  const isOwner = task.ownerId === user.id;
  switch (action) {
    case 'read':
      return isOwner || task.sharedWith.includes(user.id) || user.role === 'admin';
    case 'update':
      // 締められたタスクは、だれも直せない
      return !task.locked && (isOwner || task.sharedWith.includes(user.id));
    case 'delete':
    case 'share':
      return isOwner;
  }
}

/** 見えないタスクは「無い」ことにする（403 ではなく 404）。見えるが操作できないなら 403 */
export function statusFor(user: User, action: Action, task: Task | undefined): 200 | 403 | 404 {
  if (task === undefined || !can(user, 'read', task)) return 404;
  return can(user, action, task) ? 200 : 403;
}
