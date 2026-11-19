// 第70章 練習問題8: マイグレーションが「足すだけ」か調べる（本文 6.2節）
// 新しい版のマイグレーションを流した後も、前の版のコードが動き続けられるか（戻せるか）を、SQL の文字から調べる

export interface Problem {
  line: number; // 文（; で区切った1つ）が始まる行（1 から。文の最初の、空白でない文字の行）
  reason: string; // 下の REASONS のどれか
}

/** 前の版のコードを壊す書き方と、その理由。1つの文に複数あれば、この順に全部 */
export const REASONS = {
  drop: '表や列を消している', // DROP TABLE・DROP COLUMN
  rename: '名前を変えている', // RENAME（RENAME TO・RENAME COLUMN）
  type: '列の型を変えている', // ALTER COLUMN … TYPE（SET DATA TYPE も）
  setNotNull: 'NOT NULL を足している', // ALTER COLUMN … SET NOT NULL
  addNotNull: 'NOT NULL の列を DEFAULT 無しで足している', // ADD COLUMN … NOT NULL で、同じ文に DEFAULT が無い
} as const;

/**
 * SQL（ファイルの中身）の文を1つずつ見て、前の版を壊すものを返す
 * - 大文字・小文字を区別しない。空白や改行が複数あってもよい
 * - -- から行の終わりまで（コメント）と、'…' の中（文字。'' は ' 1つ）は見ない。; で文を区切るときも
 * - DROP INDEX・DROP CONSTRAINT・CREATE TABLE・ADD COLUMN（NULL を許す、か DEFAULT 付き）は問題にしない
 */
export function checkMigration(sql: string): Problem[] {
  // ここを書く
  void REASONS;
  throw new Error(`まだ書いていません（${sql.length}）`);
}
