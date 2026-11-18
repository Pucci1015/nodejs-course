// 練習問題6 のテスト
// 使い方: node --test hash-assets.test.ts
//   模範解答を試す: MODULE=../solutions/hash-assets.ts node --test hash-assets.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './hash-assets.ts');
const { hashAssets }: typeof import('./hash-assets.ts') = await import(pathToFileURL(file).href);

const h8 = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);
const JS = 'console.log(1);\n';
const CSS = 'body { color: black; }\n';
const html = `<link rel="stylesheet" href="/assets/style.css">\n<script type="module" src="/assets/app.js"></script>\n`;

test('名前に、中身の SHA-256 の先頭 8 文字を入れる（拡張子の前）', () => {
  const r = hashAssets(html, { 'assets/app.js': JS, 'assets/style.css': CSS });
  assert.deepEqual(r.manifest, { 'assets/app.js': `assets/app.${h8(JS)}.js`, 'assets/style.css': `assets/style.${h8(CSS)}.css` });
  assert.deepEqual(r.files, { [`assets/app.${h8(JS)}.js`]: JS, [`assets/style.${h8(CSS)}.css`]: CSS });
});

test('HTML の中の参照を書き換える', () => {
  const r = hashAssets(html, { 'assets/app.js': JS, 'assets/style.css': CSS });
  assert.equal(
    r.html,
    `<link rel="stylesheet" href="/assets/style.${h8(CSS)}.css">\n<script type="module" src="/assets/app.${h8(JS)}.js"></script>\n`,
  );
});

test('同じ中身なら同じ名前、1 文字違えば別の名前', () => {
  const a = hashAssets('', { 'assets/app.js': JS }).manifest['assets/app.js'];
  const b = hashAssets('', { 'assets/app.js': JS }).manifest['assets/app.js'];
  const c = hashAssets('', { 'assets/app.js': 'console.log(2);\n' }).manifest['assets/app.js'];
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('" で囲まれた、ちょうどその名前だけを書き換える（似た名前・本文の中の文字はそのまま）', () => {
  const src = `<script src="/assets/app.jsx"></script><p>/assets/app.js を読みます</p><script src="/assets/app.js"></script>`;
  const r = hashAssets(src, { 'assets/app.js': JS });
  assert.equal(r.html, `<script src="/assets/app.jsx"></script><p>/assets/app.js を読みます</p><script src="/assets/app.${h8(JS)}.js"></script>`);
});

test('同じファイルを2回参照していれば、両方を書き換える', () => {
  const r = hashAssets(`"/assets/app.js" "/assets/app.js"`, { 'assets/app.js': JS });
  assert.equal(r.html, `"/assets/app.${h8(JS)}.js" "/assets/app.${h8(JS)}.js"`);
});

test('深いフォルダ・名前の中の . も扱える（最後の . の前に入れる）', () => {
  const r = hashAssets('', { 'assets/fonts/noto.sans.woff2': 'font' });
  assert.equal(r.manifest['assets/fonts/noto.sans.woff2'], `assets/fonts/noto.sans.${h8('font')}.woff2`);
});

test('HTML で参照されていないファイルも、名前を変えて files に入れる', () => {
  const r = hashAssets('<p>なし</p>', { 'assets/lazy.js': 'x' });
  assert.equal(r.html, '<p>なし</p>');
  assert.deepEqual(Object.keys(r.files), [`assets/lazy.${h8('x')}.js`]);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
