// 練習問題7の模範解答: ESLint の結果（JSON）を、GitHub Actions の「注釈」の行に変える
// 確かめ方（exercises で）: MODULE=../solutions/annotate.ts node --test annotate.test.ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
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
  const lines: string[] = [];
  for (const result of results) {
    // 追加: GitHub は、リポジトリの直下から数えた場所で、どのファイルかを知る
    const file = path.relative(cwd, result.filePath).split(path.sep).join('/');
    for (const m of result.messages) {
      const level = m.severity === 2 ? 'error' : 'warning';
      const props = `file=${escapeProperty(file)},line=${m.line},col=${m.column},title=${escapeProperty(m.ruleId ?? 'ESLint')}`;
      lines.push(`::${level} ${props}::${escapeData(m.message)}`);
    }
  }
  return lines;
}

// 追加: :: の後ろ（メッセージ）では、% と改行を書き換える。% を最初に（後で足した % を書き換えないように）
function escapeData(text: string): string {
  return text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

// 追加: file=…,title=… の値では、区切りに使う , と : も書き換える
function escapeProperty(text: string): string {
  return escapeData(text).replaceAll(':', '%3A').replaceAll(',', '%2C');
}

/** error と warning の数 */
export function summarize(results: LintResult[]): { errors: number; warnings: number } {
  const all = results.flatMap((r) => r.messages);
  return {
    errors: all.filter((m) => m.severity === 2).length,
    warnings: all.filter((m) => m.severity === 1).length,
  };
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
