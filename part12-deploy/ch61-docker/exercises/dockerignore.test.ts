// 練習問題1 のテスト: app/.dockerignore を確かめる
// 使い方: node --test dockerignore.test.ts
//   模範解答を試す: MODULE=../solutions/app/.dockerignore node --test dockerignore.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isIgnored } from './dockerignore-match.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './app/.dockerignore');
const text = await readFile(file, 'utf8').catch(() => '');

test('.dockerignore がある', () => {
  assert.notEqual(text.trim(), '', `${file} がありません（または空です）`);
});

const ignored = [
  'node_modules',
  'node_modules/express/package.json',
  '.env',
  '.env.local',
  '.env.production',
  '.git',
  '.git/HEAD',
  'coverage/index.html',
  'dist/server.js',
  'npm-debug.log',
  'logs/app.log',
];
const kept = ['package.json', 'package-lock.json', 'tsconfig.json', 'src/server.ts', '.env.example'];

for (const p of ignored) {
  test(`送らない: ${p}`, () => {
    assert.equal(isIgnored(text, p), true);
  });
}
for (const p of kept) {
  test(`送る: ${p}`, () => {
    assert.equal(isIgnored(text, p), false);
  });
}
