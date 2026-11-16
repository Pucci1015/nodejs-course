// 型を確かめる部品（練習問題の *.check.ts が使う）。中身は読まなくてよい
// Equal<X, Y>: X と Y がまったく同じ型なら true、違えば false
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
// Expect<T>: T が true でなければ、tsc のエラーになる
export type Expect<T extends true> = T;
