// 第54章 練習問題7 の模範解答: 外のログインと、このアプリのユーザーを結びつける（本文6節）

export type LocalUser = { id: number; email: string; emailVerified: boolean };
export type ExternalProfile = { provider: string; sub: string; email: string | undefined; emailVerified: boolean };
export type SignInResult =
  | { kind: 'existing' | 'linked' | 'created'; userId: number }
  | { kind: 'conflict' }; // 同じアドレスのユーザーがいるが、安全に結びつけられない

export function createAccounts(initialUsers: LocalUser[] = []) {
  const users = new Map<number, LocalUser>(initialUsers.map((u) => [u.id, { ...u }]));
  /** 「provider と sub」→ ユーザーの id。sub はその IdP の中でだけ一意なので、2つを組にする */
  const identities = new Map<string, number>();
  let nextId = Math.max(0, ...initialUsers.map((u) => u.id)) + 1;
  const keyOf = (provider: string, sub: string) => JSON.stringify([provider, sub]);

  return {
    signIn(profile: ExternalProfile): SignInResult {
      const key = keyOf(profile.provider, profile.sub);
      // 1. 前にこの IdP のこの人でログインしたことがある
      const known = identities.get(key);
      if (known !== undefined) return { kind: 'existing', userId: known };

      const email = profile.email?.trim().toLowerCase();
      const sameEmail = email === undefined ? undefined : [...users.values()].find((u) => u.email === email);
      if (sameEmail !== undefined) {
        // 2. 同じアドレスのユーザーがいる。両方で確認済みのときだけ、同じ人とみなして結びつける
        if (profile.emailVerified && sameEmail.emailVerified) {
          identities.set(key, sameEmail.id);
          return { kind: 'linked', userId: sameEmail.id };
        }
        return { kind: 'conflict' };
      }
      // 3. 新しいユーザーを作る（アドレスが無い IdP もある）
      const user: LocalUser = { id: nextId++, email: email ?? '', emailVerified: email !== undefined && profile.emailVerified };
      users.set(user.id, user);
      identities.set(key, user.id);
      return { kind: 'created', userId: user.id };
    },
    getUser: (id: number) => users.get(id),
  };
}
