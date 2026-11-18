// 第59章 3節: URL に使う短い名前（スラッグ）か確かめる（第3部 第13章 練習問題6の正規表現）
const SLUG = /^([a-z0-9]+-?)*[a-z0-9]+$/;

export function isSlug(text: string): boolean {
  return SLUG.test(text);
}
