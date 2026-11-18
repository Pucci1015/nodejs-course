// 練習問題7 のテスト。一時フォルダに .md を作って確かめる
// 使い方: node --test check-links.test.ts
//   模範解答を試す: MODULE=../solutions/check-links.ts node --test check-links.test.ts
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, afterEach, before, mock, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './check-links.ts');
const mod: typeof import('./check-links.ts') = await import(pathToFileURL(file).href);
const { findBrokenLinks, main } = mod;

let root = '';

before(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'check-links-'));
  const put = async (name: string, text: string) => {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), text);
  };
  await put(
    'README.md',
    [
      '# room-booking',
      '![その日の予約の表](docs/screenshot.png)', // 2: 無い
      '[要件](docs/requirements.md) と [API](docs/api.md#予約) と [設計](docs/)', // 3: api.md が無い
      '[公式](https://render.com/docs) [メール](mailto:a@example.com) [上へ](#room-booking)',
      '```sh',
      '$ cat [これは](コードの中.md)', // 6: コードのブロックの中
      '```',
      '`[これも](コードの中.md)` は飛ばす。[空白の名前](docs/%E8%A8%AD%E8%A8%88.md)', // 8: 有る
      '[2つ目](docs/none.md) [3つ目](./scripts/)', // 9: none.md が無い
    ].join('\n'),
  );
  await put('docs/requirements.md', '# 要件\n\n[戻る](../README.md)\n[ADR](adr/0001-stack.md)\n'); // 4: 無い
  await put('docs/設計.md', '# 設計\n');
  await put('scripts/README.md', '[上](../README.md) [無い](../src/server.ts)\n'); // 1: 無い
  await put('node_modules/pkg/README.md', '[見ない](nothing.md)\n');
  await put('.github/README.md', '[見ない](nothing.md)\n');
});

after(() => rm(root, { recursive: true, force: true }));
afterEach(() => mock.restoreAll());

test('findBrokenLinks: 切れたリンクを、ファイルと行の順に', async () => {
  assert.deepEqual(await findBrokenLinks(root), [
    { file: 'README.md', line: 2, target: 'docs/screenshot.png' },
    { file: 'README.md', line: 3, target: 'docs/api.md#予約' },
    { file: 'README.md', line: 9, target: 'docs/none.md' },
    { file: 'docs/requirements.md', line: 4, target: 'adr/0001-stack.md' },
    { file: 'scripts/README.md', line: 1, target: '../src/server.ts' },
  ]);
});

/** main を呼び、console.log・console.error に出たものを集める */
async function run(argv: string[]) {
  const log = mock.method(console, 'log', () => {});
  const err = mock.method(console, 'error', () => {});
  const code = await main(argv);
  return {
    code,
    out: log.mock.calls.map((c) => String(c.arguments[0])),
    errors: err.mock.calls.map((c) => String(c.arguments[0])),
  };
}

test('main: 切れていれば行を出して 1', async () => {
  const r = await run([root]);
  assert.equal(r.code, 1);
  assert.equal(r.out[0], 'README.md:2: docs/screenshot.png が見つかりません');
  assert.equal(r.out.at(-1), '5 個のリンクが切れています');
  assert.equal(r.out.length, 6);
});

test('main: 切れていなければ 0。使い方の間違いは 2', async () => {
  const ok = await run([path.join(root, 'docs', 'adr-none-yet')]);
  assert.equal(ok.code, 2, 'フォルダが無い');
  assert.match(ok.errors.join('\n'), /フォルダ/);
  await mkdir(path.join(root, 'clean'));
  await writeFile(path.join(root, 'clean', 'README.md'), '[自分](README.md)\n');
  const clean = await run([path.join(root, 'clean')]);
  assert.deepEqual([clean.code, clean.out], [0, ['切れたリンクはありません']]);
  assert.equal((await run([])).code, 2);
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
