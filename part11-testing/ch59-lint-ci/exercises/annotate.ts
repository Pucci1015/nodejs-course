// 練習問題7: ESLint の結果（JSON）を、GitHub Actions の「注釈」の行に変える
// 使い方: npx eslint . --format json --output-file eslint.json; node annotate.ts eslint.json
// 確かめ方（exercises で）: node --test annotate.test.ts
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

export interface LintMessage {
  ruleId: string | null;
  /** 1 = warn、2 = error */
  severity: number;
  message: string;
  line: number;
  column: number;
}

export interface LintResult {
  filePath: string;
  messages: LintMessage[];
}

/** 結果を、注釈の行（::error file=…::…）の配列にする。ファイルの場所は cwd から数えた形にする */
export function toAnnotations(results: LintResult[], cwd: string): string[] {
  // ここを書く
  void results;
  void cwd;
  throw new Error('まだ書いていません');
}

/** error と warning の数 */
export function summarize(results: LintResult[]): { errors: number; warnings: number } {
  // ここを書く
  void results;
  throw new Error('まだ書いていません');
}

// ESLint の JSON のうち、使う所だけ（外から読むものは Zod で確かめる）
const Results = z.array(
  z.object({
    filePath: z.string(),
    messages: z.array(
      z.object({
        ruleId: z.string().nullable(),
        severity: z.number(),
        message: z.string(),
        line: z.number().default(1),
        column: z.number().default(1),
      }),
    ),
  }),
);

// コマンドとして動かしたとき（書き換えなくてよい）
if (import.meta.main) {
  const file = process.argv[2];
  if (file === undefined) {
    console.error('使い方: node annotate.ts <eslint の JSON のファイル>');
    process.exitCode = 2;
  } else {
    const results = Results.parse(JSON.parse(await readFile(file, 'utf8')));
    for (const line of toAnnotations(results, process.cwd())) console.log(line);
    const { errors, warnings } = summarize(results);
    console.log(`error ${errors} 個、warning ${warnings} 個`);
    if (errors > 0) process.exitCode = 1;
  }
}
