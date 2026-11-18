// 第62章 練習問題7: 止めずにデプロイできないマイグレーションを見つける（本文4.3節）

/** 調べる決まり。上から順に試し、当てはまったものを全部返す */
const RULES: { test: (stmt: string) => boolean; message: string }[] = [
  {
    test: (s) => /\bdrop\s+column\b/.test(s),
    message: 'DROP COLUMN: 古い版がまだ使っています（後のデプロイで消します）',
  },
  {
    test: (s) => /\brename\b/.test(s),
    message: 'RENAME: 古い版は古い名前を使っています（足す → 移す → 消す に分けます）',
  },
  {
    // ADD COLUMN から、次の , か文の終わりまでを1つの列の定義として見る
    test: (s) => [...s.matchAll(/\badd\s+column\b[^,]*/g)].some(([def]) => /\bnot\s+null\b/.test(def) && !/\bdefault\b/.test(def)),
    message: 'NOT NULL の列を DEFAULT なしで足すと、古い版の INSERT が失敗します',
  },
  {
    test: (s) => /\balter\s+column\s+\S+\s+(set\s+data\s+)?type\b/.test(s),
    message: '列の型を変えると、表を書き直す間、読み書きが止まります',
  },
  {
    test: (s) => /\bcreate\s+(unique\s+)?index\b/.test(s) && !/\bconcurrently\b/.test(s),
    message: 'CREATE INDEX は、作り終わるまで書き込みを止めます（CONCURRENTLY を付けます）',
  },
  {
    test: (s) => /\bdrop\s+table\b/.test(s),
    message: 'DROP TABLE: 古い版がまだ使っています（後のデプロイで消します）',
  },
];

/**
 * SQL のファイルの中身を受け取り、気をつける所を「N 文目: 文」の形の配列で返す。
 * 文は ; で分け、空の文は数えない。-- から行の終わりまでは注釈として捨てる。
 */
export function checkMigration(sql: string): string[] {
  const statements = sql
    .replace(/--.*$/gm, '') // 注釈を捨てる（m で、$ が各行の終わりに当たる）
    .split(';')
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter((s) => s !== '');
  const found: string[] = [];
  statements.forEach((stmt, i) => {
    for (const rule of RULES) {
      if (rule.test(stmt)) found.push(`${i + 1} 文目: ${rule.message}`);
    }
  });
  return found;
}
