// 練習問題3 の解答: iconv-lite で Shift_JIS（CP932）と UTF-8 を変換する CLI
// 使い方（~/dev/ch14/packages にコピーし、npm install iconv-lite をしてから）:
//   node convert.mjs to-utf8 data/members-sjis.csv out/members-utf8.csv
//   node convert.mjs to-sjis data/order-utf8-ok.csv out/order-sjis.csv
// 確かめ方: bash <教材>/ch14-modules-npm/exercises/check-convert.sh ~/dev/ch14/packages
import fs from 'node:fs/promises';
import path from 'node:path';
import iconv from 'iconv-lite'; // CommonJS のパッケージ。default import で module.exports を受け取る

// Windows の「Shift_JIS」は、正確には Microsoft が拡張した CP932（Windows-31J）。①や髙もこちらにしか無い
const ENCODING = 'cp932';

// Mac で打つと出る文字と、CP932 にある「見た目がほぼ同じ文字」の対応
const MAC_TO_CP932 = new Map([
  ['〜', '～'], // 〜 WAVE DASH → ～ FULLWIDTH TILDE
  ['−', '－'], // − MINUS SIGN → － FULLWIDTH HYPHEN-MINUS
  ['‖', '∥'], // ‖ DOUBLE VERTICAL LINE → ∥ PARALLEL TO
  ['¢', '￠'], // ¢ → ￠
  ['£', '￡'], // £ → ￡
  ['¬', '￢'], // ¬ → ￢
]);

function toUtf8(buffer) {
  return iconv.decode(buffer, ENCODING).replace(/\r\n/g, '\n');
}

function toSjis(buffer) {
  let text = buffer.toString('utf8');
  if (text.startsWith('﻿')) text = text.slice(1); // BOM を取る
  text = text.replace(/\r\n/g, '\n'); // いったん LF にそろえてから CRLF にする（\r\r\n を防ぐ）

  const problems = [];
  const lines = text.split('\n').map((line, i) => {
    // for...of と Array.from は「文字」（コードポイント）ごとに分ける。𠮷 のような文字も1文字として数えられる
    const chars = Array.from(line, (ch) => MAC_TO_CP932.get(ch) ?? ch);
    chars.forEach((ch, j) => {
      // iconv-lite は、表せない文字を黙って ? にする。行き帰りして同じに戻るかで確かめる
      if (iconv.decode(iconv.encode(ch, ENCODING), ENCODING) !== ch) {
        const code = ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
        problems.push(`${i + 1}行目 ${j + 1}文字目: ${ch}（U+${code}）は Shift_JIS にできません`);
      }
    });
    return chars.join('');
  });
  if (problems.length > 0) {
    const err = new Error(problems.join('\n'));
    err.code = 'UNENCODABLE';
    throw err;
  }
  return iconv.encode(lines.join('\r\n'), ENCODING);
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
