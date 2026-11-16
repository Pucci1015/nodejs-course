// 第45章 練習問題1: 条件で付けるクラスの名前をつなぐ（本文2.3節）
export type ClassValue = string | false | null | undefined | Record<string, boolean | null | undefined>;

export function classNames(...values: ClassValue[]): string {
  throw new Error('まだ書いていません');
}
