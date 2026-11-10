// 第16章 3.2節で書く、parseArgs で引数を解析するプログラムの完成形
// 使い方（~/dev/part03/ch16-cli で）: node samples/args.mjs alice bob --shout -t 2
import { parseArgs } from 'node:util';

const options = {
  shout: { type: 'boolean', short: 's' },
  times: { type: 'string', short: 't', default: '1' },
};

try {
  const { values, positionals } = parseArgs({ args: process.argv.slice(2), options, allowPositionals: true });
  console.log('values     :', values);
  console.log('positionals:', positionals);
} catch (err) {
  console.error('エラー:', err.message);
  process.exitCode = 2; // 使い方の間違い
}
