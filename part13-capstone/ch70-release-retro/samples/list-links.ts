// 第70章 7.2節: フォルダの中の .md を全部読み、リンクの行き先を並べる
// 使い方: node list-links.ts ~/dev/room-booking
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.argv[2] ?? '.';
// recursive: true で、下のフォルダのファイルも、root から見たパスで返る
const names = await readdir(root, { recursive: true });
const mds = names.filter((n) => n.endsWith('.md') && !n.split(path.sep).includes('node_modules')).toSorted();
for (const md of mds) {
  const text = await readFile(path.join(root, md), 'utf8');
  // [文字](行き先) の行き先を、全部取り出す。matchAll は、g の付いた正規表現の、当たったもの全部を返す
  const targets = [...text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]);
  if (targets.length > 0) console.log(`${md}: ${targets.join('  ')}`);
}
