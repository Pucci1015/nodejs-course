// 練習問題3 の模範解答: UserRepo のメモリの偽物
import { ConflictError, type User, type UserRepo } from '../exercises/users.ts';

export function createMemoryUsers(): UserRepo {
  // 追加: id → ユーザー。Map は入れた順に並ぶので、id の順になる
  const users = new Map<number, User>();
  let nextId = 1;
  const copy = (user: User): User => ({ ...user });
  const find = (email: string) => [...users.values()].find((user) => user.email === email.toLowerCase());

  return {
    async create({ email, name }) {
      // PostgreSQL の UNIQUE と lower() と同じ決まり
      if (find(email) !== undefined) throw new ConflictError(`登録済みのアドレスです: ${email}`);
      const user: User = { id: nextId++, email: email.toLowerCase(), name };
      users.set(user.id, user);
      return copy(user);
    },
    async findByEmail(email) {
      const user = find(email);
      return user && copy(user);
    },
    async rename(id, name) {
      const user = users.get(id);
      if (user === undefined) return undefined;
      user.name = name;
      return copy(user);
    },
    async list() {
      return [...users.values()].map(copy);
    },
  };
}
