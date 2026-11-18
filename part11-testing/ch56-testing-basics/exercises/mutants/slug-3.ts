// ミュータント: 続いた - を1つにしない
export function toSlug(title: string): string | null {
  const slug = title
    .normalize('NFKC') // 全角の英数字を半角にする（ＡＢＣ → ABC）
    .toLowerCase()
    .replace(/[\s_]+/g, '-') // 空白と _ は - にする
    .replace(/[^a-z0-9-]/g, '') // 英小文字・数字・- のほかは消す
    .replace(/^-|-$/g, '') // 最初と最後の - は消す
    .slice(0, 50) // 長くても 50 文字まで
    .replace(/-$/, ''); // 切ったところが - なら消す
  return slug === '' ? null : slug;
}
