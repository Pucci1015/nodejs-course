// 7節: 認可。「この人は、このタスクに、この操作をしてよいか」を1つの関数で決める
export type Role = 'member' | 'admin';
export type User = { id: number; role: Role };
export type Task = { id: number; ownerId: number; title: string };
export type Action = 'read' | 'update' | 'delete';

/** してよければ true。決まりは、ここ1か所にまとめる（ルートごとに if を書き散らさない） */
export function can(user: User, action: Action, task: Task): boolean {
  if (task.ownerId === user.id) return true; // 自分のタスクは、何でもできる
  if (user.role === 'admin') return action !== 'delete'; // 管理者は、読む・直すまで（消すのは本人だけ）
  return false;
}

// 試す: node samples/authorize.ts
if (import.meta.main) {
  const alice: User = { id: 1, role: 'member' };
  const bob: User = { id: 2, role: 'member' };
  const admin: User = { id: 3, role: 'admin' };
  const task: Task = { id: 10, ownerId: alice.id, title: '牛乳を買う' };
  for (const [name, user] of [['alice', alice], ['bob', bob], ['admin', admin]] as const) {
    const row = (['read', 'update', 'delete'] as const).map((a) => `${a}=${can(user, a, task)}`).join(' ');
    console.log(name.padEnd(5), row);
  }
}
