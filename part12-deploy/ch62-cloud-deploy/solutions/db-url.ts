// 第62章 練習問題1: DATABASE_URL を確かめる（本文4.1節）

export type DatabaseUrlReport = {
  /** パスワードを *** に替えた URL。読めない URL なら '(読めません)' */
  redacted: string;
  /** 本番で困るところ（無ければ空の配列） */
  problems: string[];
};

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function inspectDatabaseUrl(url: string): DatabaseUrlReport {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    // 読めない文字列は、パスワードを含んでいるかもしれないので、そのまま返さない
    return { redacted: '(読めません)', problems: ['URL として読めません'] };
  }
  const problems: string[] = [];
  if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') {
    problems.push('postgres:// か postgresql:// で始まっていません');
  }
  if (LOCAL_HOSTS.includes(u.hostname)) problems.push('このコンピュータ（localhost）を指しています');
  if (u.password === '') problems.push('パスワードがありません');
  if (u.pathname === '/' || u.pathname === '') problems.push('データベースの名前がありません');

  const mode = u.searchParams.get('sslmode');
  if (mode === null || mode === 'disable' || mode === 'allow' || mode === 'prefer') {
    problems.push('暗号化しない設定です（sslmode=verify-full にします）');
  } else if (mode === 'require' || mode === 'verify-ca') {
    problems.push(`sslmode=${mode} は pg 9 で意味が変わります（verify-full と書きます）`);
  }

  if (u.password !== '') u.password = '***';
  return { redacted: u.href, problems };
}
