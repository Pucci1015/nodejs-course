// 第59章 3節: URL に使う短い名前（スラッグ）か確かめる（eslint-plugin-regexp の指摘を直した完成形）
// 修正: 「[a-z0-9]+ の後に - があってもなくてもよい」を * でくり返すと、同じ文字列の分け方が何通りもでき、
//       合わない文字列で、試す数が爆発する（ReDoS。第3部 第13章）。「- の後には必ず1文字以上」の形に書き直した
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSlug(text: string): boolean {
  return SLUG.test(text);
}
