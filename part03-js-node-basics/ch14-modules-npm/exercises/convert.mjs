// 練習問題3: iconv-lite で Shift_JIS（CP932）と UTF-8 を変換する CLI を完成させてください。
// 要件は README にあります。このファイルを ~/dev/ch14/packages にコピーし、
// そのフォルダで npm install iconv-lite をしてから作ります。
// 確かめ方: bash <このフォルダ>/check-convert.sh ~/dev/ch14/packages
import fs from 'node:fs/promises';
import path from 'node:path';
// ここで iconv-lite を import する

function toUtf8(buffer) {
  // ここを書く（Shift_JIS のバイト列 → UTF-8 の文字列。改行は LF）
}

function toSjis(buffer) {
  // ここを書く（UTF-8 のバイト列 → Shift_JIS のバイト列。改行は CRLF）
  // Shift_JIS にできない文字があれば、code が 'UNENCODABLE' のエラーを投げる
}

async function main() {
  const [command, input, output] = process.argv.slice(2);
  if (!['to-utf8', 'to-sjis'].includes(command) || !input || !output) {
    console.error('使い方: node convert.mjs <to-utf8|to-sjis> <入力ファイル> <出力ファイル>');
    process.exitCode = 2;
    return;
  }
  const buffer = await fs.readFile(input);
  let result;
  try {
    result = command === 'to-utf8' ? toUtf8(buffer) : toSjis(buffer);
  } catch (err) {
    if (err.code !== 'UNENCODABLE') throw err;
    console.error(err.message);
    process.exitCode = 1;
    return; // 途中までのファイルは作らない
  }
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, result);
  console.log(`${input} → ${output}（${command}）`);
}

await main();
