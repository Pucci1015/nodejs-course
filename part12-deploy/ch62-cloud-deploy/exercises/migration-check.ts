// 第62章 練習問題7: 止めずにデプロイできないマイグレーションを見つける（本文4.3節）

/**
 * SQL のファイルの中身を受け取り、気をつける所を「N 文目: 文」の形の配列で返す。
 * 文は ; で分け、空の文は数えない。-- から行の終わりまでは注釈として捨てる。
 */
export function checkMigration(sql: string): string[] {
  // ここを書く
  throw new Error(`まだ書いていません: ${sql.length}`);
}
