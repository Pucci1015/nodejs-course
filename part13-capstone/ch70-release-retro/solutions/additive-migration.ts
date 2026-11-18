// 第70章 練習問題8 の模範解答: マイグレーションが「足すだけ」か調べる（本文 6.2節）
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

// 追加: それぞれの書き方を見つける正規表現。\s+ で、空白や改行がいくつあってもよい。i で大文字・小文字を区別しない
const RULES: { reason: string; test: (code: string) => boolean }[] = [
  { reason: REASONS.drop, test: (c) => /\bdrop\s+(table|column)\b/i.test(c) },
  { reason: REASONS.rename, test: (c) => /\brename\b/i.test(c) },
  { reason: REASONS.type, test: (c) => /\balter\s+column\s+\w+\s+(set\s+data\s+)?type\b/i.test(c) },
  { reason: REASONS.setNotNull, test: (c) => /\bset\s+not\s+null\b/i.test(c) },
  {
    reason: REASONS.addNotNull,
    test: (c) => /\badd\s+column\b[^,]*\bnot\s+null\b/i.test(c) && !/\bdefault\b/i.test(c),
  },
];

/**
 * コメントと '…' の中を空白に置き換える。改行は残すので、行の番号は変わらない
 * 一文字ずつ見て、「ふつう」「コメントの中」「文字の中」のどこにいるかを覚えておく
 */
function blankOut(sql: string): string {
  let out = '';
  let state: 'code' | 'comment' | 'string' = 'code';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i] ?? '';
    if (state === 'code') {
      if (ch === '-' && sql[i + 1] === '-') state = 'comment';
      else if (ch === "'") state = 'string';
      out += state === 'code' ? ch : ' ';
    } else if (state === 'comment') {
      if (ch === '\n') state = 'code';
      out += ch === '\n' ? '\n' : ' ';
    } else {
      // 文字の中。'' は ' 1つなので、まだ文字の中
      if (ch === "'" && sql[i + 1] === "'") {
        out += '  ';
        i++;
      } else {
        if (ch === "'") state = 'code';
        out += ch === '\n' ? '\n' : ' ';
      }
    }
  }
  return out;
}

/**
 * SQL（ファイルの中身）の文を1つずつ見て、前の版を壊すものを返す
 * - 大文字・小文字を区別しない。空白や改行が複数あってもよい
 * - -- から行の終わりまで（コメント）と、'…' の中（文字。'' は ' 1つ）は見ない。; で文を区切るときも
 * - DROP INDEX・DROP CONSTRAINT・CREATE TABLE・ADD COLUMN（NULL を許す、か DEFAULT 付き）は問題にしない
 */
export function checkMigration(sql: string): Problem[] {
  const code = blankOut(sql);
  const problems: Problem[] = [];
  let offset = 0; // 今の文が、code の何文字目から始まるか
  for (const statement of code.split(';')) {
    const lead = statement.length - statement.trimStart().length; // 頭の空白の数
    if (statement.trim() !== '') {
      // 追加: 文の最初の文字より前にある改行の数 + 1 が、行の番号
      const line = code.slice(0, offset + lead).split('\n').length;
      for (const rule of RULES) if (rule.test(statement)) problems.push({ line, reason: rule.reason });
    }
    offset += statement.length + 1; // + 1 は ; の分
  }
  return problems;
}
