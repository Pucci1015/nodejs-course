// 練習問題1 の模範解答
import { parseArgs } from 'node:util';

const USAGE = '使い方: node greet-cli.mjs [名前...] [-s|--shout] [-t|--times 回数] [-h|--help]';

const options = {
  shout: { type: 'boolean', short: 's' },
  times: { type: 'string', short: 't', default: '1' },
  help: { type: 'boolean', short: 'h' },
};

let parsed;
try {
  parsed = parseArgs({ args: process.argv.slice(2), options, allowPositionals: true });
} catch (err) {
  console.error(`エラー: ${err.message}`);
  console.error(USAGE);
  process.exitCode = 2;
}

if (parsed) {
  const { values, positionals } = parsed;
  if (values.help) {
    console.log(USAGE); // 頼まれて出す使い方は、標準出力
  } else if (!/^[1-9]\d*$/.test(values.times)) {
    console.error(`エラー: --times には 1 以上の整数を書いてください: ${values.times}`);
    process.exitCode = 2;
  } else {
    const names = positionals.length > 0 ? positionals : ['world'];
    for (let i = 0; i < Number(values.times); i++) {
      for (const name of names) {
        const text = `こんにちは、${name}`;
        console.log(values.shout ? `${text.toUpperCase()}！` : text);
      }
    }
  }
}
