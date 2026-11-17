// 第54章 練習問題7: 外のログインと、このアプリのユーザーを結びつける（本文6節）

export type LocalUser = { id: number; email: string; emailVerified: boolean };
export type ExternalProfile = { provider: string; sub: string; email: string | undefined; emailVerified: boolean };
export type SignInResult =
  | { kind: 'existing' | 'linked' | 'created'; userId: number }
  | { kind: 'conflict' }; // 同じアドレスのユーザーがいるが、安全に結びつけられない

export function createAccounts(initialUsers: LocalUser[] = []) {
  const users = new Map<number, LocalUser>(initialUsers.map((u) => [u.id, { ...u }]));
  // ここを書く（「provider と sub」→ ユーザーの id の Map を作る）
  return {
    signIn(profile: ExternalProfile): SignInResult {
      throw new Error(`まだ書いていません: ${JSON.stringify(profile)}`);
    },
    getUser: (id: number) => users.get(id),
  };
}
