// 第60章 練習問題8の模範解答: .env.example と見比べて、設定の漏れと書き間違いを知らせるコマンド（本文2・6節）
// 使い方: node check-env.ts .env.example [--env-file .env] [--production]
//   終了コード: 0 = 問題なし、1 = 足りない設定がある、2 = 使い方の間違い・ファイルが読めない
import { readFile } from 'node:fs/promises';
import { parseArgs, parseEnv } from 'node:util';

const USAGE = '使い方: node check-env.ts .env.example [--env-file .env] [--production]';

/** ファイルを読んで parseEnv する。読めなければ undefined（理由は標準エラー出力に） */
async function readEnvFile(file: string): Promise<Record<string, string> | undefined> {
  try {
    return parseEnv(await readFile(file, 'utf8')) as Record<string, string>;
  } catch (err) {
    console.error(`${file} を読めません: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

export async function main(argv: string[], env: NodeJS.ProcessEnv): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { 'env-file': { type: 'string' }, production: { type: 'boolean', default: false } },
    });
  } catch (err) {
    console.error(`${err instanceof Error ? err.message : String(err)}\n${USAGE}`);
    return 2;
  }
  const [exampleFile] = parsed.positionals;
  if (exampleFile === undefined || parsed.positionals.length > 1) {
    console.error(USAGE);
    return 2;
  }
  const example = await readEnvFile(exampleFile);
  if (example === undefined) return 2;
  const envFile = parsed.values['env-file'];
  const fromFile = envFile === undefined ? {} : await readEnvFile(envFile);
  if (fromFile === undefined) return 2;

  // node --env-file と同じく、環境変数がファイルの値より強い（本文2.3節）
  const actual: Record<string, string | undefined> = { ...fromFile, ...env };
  const production = parsed.values.production;
  let missing = 0;

  // 1. ファイルに書いてあるのに、例に無い名前（書き間違いかもしれない）。環境変数は名前が多すぎるので見ない
  for (const name of Object.keys(fromFile)) {
    if (!(name in example)) console.log(`[注意] ${name}: ${exampleFile} に無い名前です（書き間違い?）`);
  }
  // 2. 例で値が空の名前（既定の値が無い）に、値があるか。値そのものは出さない
  for (const [name, exampleValue] of Object.entries(example)) {
    if (exampleValue !== '') continue;
    const value = actual[name];
    if (value !== undefined && value !== '') continue;
    if (production) {
      console.log(`[NG] ${name}: 値がありません（本番では必須）`);
      missing += 1;
    } else {
      console.log(`[注意] ${name}: 値がありません（本番では必須）`);
    }
  }
  if (missing > 0) {
    console.log(`${missing} 件の必須の設定が足りません`);
    return 1;
  }
  console.log('問題ありません');
  return 0;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2), process.env);
}
