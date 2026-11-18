// 練習問題3: UserRepo のメモリの偽物を書く（約束は users.ts と users-contract.ts）
import { ConflictError, type User, type UserRepo } from './users.ts';

export function createMemoryUsers(): UserRepo {
  // ここを書く
  void ConflictError;
  const _example: User[] = [];
  void _example;
  throw new Error('まだ書いていません');
}
