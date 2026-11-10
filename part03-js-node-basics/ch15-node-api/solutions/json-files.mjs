// 練習問題1 の模範解答
import fs from 'node:fs/promises';
import path from 'node:path';

export async function readJson(file, fallback) {
  try {
    const text = await fs.readFile(file, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback; // 無いときだけ、代わりの値
    throw err; // それ以外は、呼んだ側に知らせる
  }
}

export async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

export async function listMarkdown(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)
    .toSorted();
}
