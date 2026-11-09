// kana-lib のテスト。パッケージの「外から使う人」と同じ名前（kana-lib、kana-lib/romaji）で読み込む。
// 自分のパッケージを自分の名前で import できるのは、package.json に "exports" があるときだけ（自己参照）。
// 使い方: npm test   （kana-lib フォルダで）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

test('import "kana-lib" で、ひらがな ⇔ カタカナ', async () => {
  const { toKatakana, toHiragana } = await import('kana-lib');
  assert.equal(toKatakana('ねこ と いぬ'), 'ネコ ト イヌ');
  assert.equal(toHiragana('コーヒー'), 'こーひー');
});

test('import "kana-lib/romaji" で、ローマ字', async () => {
  const { toRomaji } = await import('kana-lib/romaji');
  assert.equal(toRomaji('すし'), 'sushi');
  assert.equal(toRomaji('フジサン'), 'fujisan');
});

test('CommonJS から require("kana-lib") でも使える', () => {
  const require = createRequire(import.meta.url);
  assert.equal(require('kana-lib').toKatakana('あ'), 'ア');
});

test('package.json は読める（バージョンを調べるツールのため）', async () => {
  const pkg = await import('kana-lib/package.json', { with: { type: 'json' } });
  assert.equal(pkg.default.name, 'kana-lib');
});

test('内部の部品（src/internal）は、外から import できない', async () => {
  for (const name of ['kana-lib/src/internal/table.mjs', 'kana-lib/src/index.mjs', 'kana-lib/internal/table']) {
    await assert.rejects(import(name), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, name);
  }
});
