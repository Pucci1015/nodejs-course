// 練習問題4: confirm() を実際の端末で試す
// 使い方:
//   node confirm-demo.mjs                 （端末で答える。Ctrl+C・Ctrl+D も試す）
//   node confirm-demo.mjs --yes           （聞かずに進む）
//   echo y | node confirm-demo.mjs        （端末ではないので断る）
//   MODULE=../solutions/confirm.mjs node confirm-demo.mjs   （解答例で試す）
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { confirm } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './confirm.mjs')).href);

try {
  const ok = await confirm('メモを3件消します。よろしいですか？', { assumeYes: process.argv.includes('--yes') });
  console.log(ok ? '消しました（ふり）' : 'やめました');
} catch (err) {
  console.error(`エラー: ${err.message}`);
  process.exitCode = err.exitCode ?? 1;
}
