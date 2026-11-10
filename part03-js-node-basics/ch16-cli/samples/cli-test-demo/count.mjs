#!/usr/bin/env node
// 行数と文字数を数える小さな CLI。テストの対象（第16章 10節）
// 使い方: node count.mjs [ファイル...]   ファイルが無ければ標準入力を読む
//         node count.mjs --help
import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';

const USAGE = '使い方: count [--chars] [ファイル...]';

async function readAll(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function count(text) {
  const lines = text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  return { lines, chars: [...text].length };
}

async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: { chars: { type: 'boolean', short: 'c' }, help: { type: 'boolean', short: 'h' } }, allowPositionals: true });
  } catch (err) {
    console.error(`count: ${err.message}\n${USAGE}`);
    return 2; // 使い方の間違い
  }
  if (parsed.values.help) {
    console.log(USAGE);
    return 0;
  }
  const show = (c, name) => console.log([c.lines, ...(parsed.values.chars ? [c.chars] : []), ...(name ? [name] : [])].join('\t'));

  if (parsed.positionals.length === 0) {
    show(count(await readAll(process.stdin)));
    return 0;
  }
  let code = 0;
  for (const file of parsed.positionals) {
    try {
      show(count(await fs.readFile(file, 'utf8')), file);
    } catch (err) {
      console.error(`count: ${file}: ${err.code === 'ENOENT' ? 'ファイルがありません' : err.message}`);
      code = 1; // 1つ失敗しても、残りは続ける。最後に 1 で終わる
    }
  }
  return code;
}

process.exitCode = await main(process.argv.slice(2));
