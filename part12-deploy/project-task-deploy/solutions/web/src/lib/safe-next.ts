// 追加（第10部）: ログインの後に戻るページ（?next=…）を、このサイトの中のパスだけにする（オープンリダイレクトへの備え。第9章の safeRedirectPath() と同じ考え）
// '/tasks/1' はそのまま。'https://…'・'//example.com'（ほかのサイト）・'/\example.com' などは '/' にする
export function safeNext(value: string | null): string {
  if (value === null || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}
