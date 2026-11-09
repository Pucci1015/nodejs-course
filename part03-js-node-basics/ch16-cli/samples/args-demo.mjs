// util.parseArgs でコマンドラインの引数を解析する（第16章 3節）
// 使い方:
//   node args-demo.mjs add 牛乳を買う --tag 買い物 -t 急ぎ --due 2026-11-05 -v
//   node args-demo.mjs --help
//   node args-demo.mjs add -x            （知らないオプション → エラー）
//   node args-demo.mjs add -- --これはオプションではない
import { parseArgs } from 'node:util';

const options = {
  tag: { type: 'string', short: 't', multiple: true }, // 何回でも書ける → 配列
  due: { type: 'string' },
  verbose: { type: 'boolean', short: 'v' },
  help: { type: 'boolean', short: 'h' },
  limit: { type: 'string', default: '10' }, // 数でも type は 'string'。自分で Number にする
};

try {
  const { values, positionals } = parseArgs({ args: process.argv.slice(2), options, allowPositionals: true });
  console.log('values     :', values);
  console.log('positionals:', positionals);
  const limit = Number(values.limit);
  if (!Number.isInteger(limit) || limit < 1) throw new Error(`--limit は1以上の整数にしてください: ${values.limit}`);
} catch (err) {
  // strict（既定）では、知らないオプションや値の無い --due などはエラーになる
  console.error(`エラー: ${err.message}`);
  console.error('使い方: node args-demo.mjs <コマンド> [引数...] [--tag 名前]... [--due 日付] [-v]');
  process.exitCode = 2; // 使い方の間違いは 2 にするのが慣習
}
