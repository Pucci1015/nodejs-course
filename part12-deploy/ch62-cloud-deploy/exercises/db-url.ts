// 第62章 練習問題1: DATABASE_URL を確かめる（本文4.1節）

export type DatabaseUrlReport = {
  /** パスワードを *** に替えた URL。読めない URL なら '(読めません)' */
  redacted: string;
  /** 本番で困るところ（無ければ空の配列） */
  problems: string[];
};

export function inspectDatabaseUrl(url: string): DatabaseUrlReport {
  // ここを書く
  throw new Error(`まだ書いていません: ${url.length}`);
}
