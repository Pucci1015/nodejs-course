// 練習問題3 解答例: grep のような CLI を、パイプの中でも正しく動くように直したもの
// 使い方: node grep.mjs [-i] [-c] [--color=auto|always|never] <パターン> [ファイル...]
import fs from 'node:fs';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { parseArgs, styleText } from 'node:util';

const USAGE = '使い方: grep [-i] [-c] [--color=auto|always|never] <パターン> [ファイル...]';

// 修正: エラーは標準エラー出力へ。標準出力には結果だけを出す
const fail = (msg) => console.error(`grep: ${msg}`);

// 追加: 読む人がいなくなったら（| head など）、静かに終わる
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0); // もう書けないので、ここでは exit で良い
  throw err;
});

// 背圧を守って書く
async function write(s) {
  if (!process.stdout.write(s)) await once(process.stdout, 'drain');
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
    return 2;
  }
  if (positionals.length === 0) {
    fail(`パターンを指定してください\n${USAGE}`);
    return 2;
  }
  if (!['auto', 'always', 'never'].includes(values.color)) {
    fail(`--color は auto, always, never のどれかです: ${values.color}`);
    return 2;
  }

  const [pattern, ...files] = positionals;
  let re;
  try {
    re = new RegExp(pattern, values['ignore-case'] ? 'gi' : 'g');
  } catch (err) {
    fail(`パターンが正しくありません: ${err.message}`);
    return 2; // 修正: エラーは 2
  }

  // 修正: auto のときは styleText に任せる（端末か、NO_COLOR・FORCE_COLOR を見る）
  const paint = (s) =>
    values.color === 'never' ? s : styleText(['bold', 'red'], s, { validateStream: values.color === 'auto', stream: process.stdout });
  const highlight = (line) => line.replace(re, (m) => (m === '' ? m : paint(m)));

  const showName = files.length > 1;
  let matched = false;
  let hadError = false;

  async function search(input, name) {
    // 修正: readline に任せると、チャンクの境目で切れた行や文字（UTF-8 の途中）も正しくつながる
    const rl = createInterface({ input, crlfDelay: Infinity });
    let n = 0;
    for await (const line of rl) {
      re.lastIndex = 0;
      if (!re.test(line)) continue;
      n++;
      matched = true;
      if (!values.count) await write(`${showName ? `${name}:` : ''}${highlight(line)}\n`);
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
        hadError = true; // 修正: 1つ失敗しても、残りのファイルは続ける
      }
    }
  }
  // 修正: grep と同じ終了コード。エラーがあれば 2、見つかれば 0、見つからなければ 1
  return hadError ? 2 : matched ? 0 : 1;
}

// 修正: process.exit() ではなく exitCode。書きかけの出力を捨てない
process.exitCode = await main(process.argv.slice(2));
