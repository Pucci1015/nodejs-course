// 練習問題3 で使う、ユーザーのリポジトリの形（書き換えなくてよい）
export { ConflictError } from './types.ts';

export interface User {
  id: number;
  email: string; // いつも小文字で覚える
  name: string;
}

export interface UserRepo {
  /** email は小文字にして覚える。大文字・小文字だけが違う同じアドレスがあれば ConflictError。id は 1, 2, 3, … */
  create(input: { email: string; name: string }): Promise<User>;
  /** 大文字・小文字を区別せずに探す。無ければ undefined */
  findByEmail(email: string): Promise<User | undefined>;
  /** 無ければ undefined */
  rename(id: number, name: string): Promise<User | undefined>;
  /** id の順に、全部 */
  list(): Promise<User[]>;
}
