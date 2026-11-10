// 練習問題8: grep のような CLI。端末で試すと動いているように見えますが、
// パイプやリダイレクトの中で使うと、おかしなところがたくさんあります。
// 確かめる: bash check-grep.sh buggy-grep.mjs
// 使い方: node buggy-grep.mjs [-i] [-c] [--color=auto|always|never] <パターン> [ファイル...]
import fs from 'node:fs';
import { parseArgs } from 'node:util';

const USAGE = '使い方: grep [-i] [-c] [--color=auto|always|never] <パターン> [ファイル...]';

const fail = (msg) => console.log(`grep: ${msg}`);

// 背圧を守って書く
async function write(s) {
  if (!process.stdout.write(s)) await new Promise((resolve) => process.stdout.once('drain', resolve));
}

async function main(argv) {
  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      options: {
        'ignore-case': { type: 'boolean', short: 'i' },
        count: { type: 'boolean', short: 'c' },
        color: { type: 'string', default: 'auto' },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    fail(`${err.message}\n${USAGE}`);
    return;
  }
  if (positionals.length === 0) {
    fail(`パターンを指定してください\n${USAGE}`);
    return;
  }

  const [pattern, ...files] = positionals;
  let re;
  try {
    re = new RegExp(pattern, values['ignore-case'] ? 'gi' : 'g');
  } catch (err) {
    fail(`パターンが正しくありません: ${err.message}`);
    return;
  }

  const paint = (s) => (values.color === 'never' ? s : `\x1b[1;31m${s}\x1b[0m`);
  const highlight = (line) => line.replace(re, (m) => (m === '' ? m : paint(m)));

  const showName = files.length > 1;

  async function search(input, name) {
    let n = 0;
    for await (const chunk of input) {
      const lines = chunk.toString().split('\n');
      if (lines.at(-1) === '') lines.pop();
      for (const line of lines) {
        re.lastIndex = 0;
        if (!re.test(line)) continue;
        n++;
        if (!values.count) await write(`${showName ? `${name}:` : ''}${highlight(line)}\n`);
      }
    }
    if (values.count) await write(`${showName ? `${name}:` : ''}${n}\n`);
  }

  if (files.length === 0) {
    await search(process.stdin, '(標準入力)');
  } else {
    for (const file of files) {
      try {
        await search(fs.createReadStream(file), file);
      } catch (err) {
        fail(`${file}: ${err.code === 'ENOENT' ? 'ファイルがありません' : err.message}`);
      }
    }
  }
}

await main(process.argv.slice(2));
process.exit(0);
