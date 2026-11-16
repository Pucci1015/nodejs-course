// 練習問題1: この JavaScript のファイルを wordcount.ts にコピーして、型を付けてください（README）
// 使い方: node wordcount.mjs ファイル [上位の数]
import { readFile } from 'node:fs/promises';

export function countText(text) {
  const lines = text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  const words = text.split(/\s+/).filter((w) => w !== '');
  return { lines, words: words.length, chars: [...text].length };
}

export function topWords(text, n) {
  const counts = new Map();
  for (const w of text.toLowerCase().split(/[^\p{L}\p{N}']+/u)) {
    if (w === '') continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts]
    .map(([word, count]) => ({ word, count }))
    .toSorted((a, b) => b.count - a.count || (a.word < b.word ? -1 : 1))
    .slice(0, n);
}

export async function main(argv) {
  const [file, nText] = argv;
  if (file === undefined) {
    console.error('使い方: node wordcount.ts ファイル [上位の数]');
    return 1;
  }
  const n = nText === undefined ? 3 : Number(nText);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`上位の数は 1 以上の整数です: ${nText}`);
    return 1;
  }
  const text = await readFile(file, 'utf8');
  const c = countText(text);
  console.log(`${c.lines}行 ${c.words}語 ${c.chars}文字`);
  for (const { word, count } of topWords(text, n)) console.log(`${count} ${word}`);
  return 0;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
