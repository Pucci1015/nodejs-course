// 練習問題3 用: env-report.mjs のテスト
// 使い方: node --test env-report.test.mjs
//   模範解答を試す: MODULE=../solutions/env-report.mjs node --test env-report.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './env-report.mjs');
const { commandVersion, envReport } = await import(pathToFileURL(modulePath).href);

test('commandVersion: node --version の結果を、前後の空白を取って返す', async () => {
  assert.equal(await commandVersion(process.execPath), process.version);
});

test('commandVersion: 引数を渡せる', async () => {
  assert.equal(await commandVersion(process.execPath, ['-p', '1 + 2']), '3');
});

test('commandVersion: 見つからないコマンドなら null', async () => {
  assert.equal(await commandVersion('no-such-command-ch15'), null);
});

test('commandVersion: コマンドが失敗したら（終了コードが 0 以外）、その失敗を投げる', async () => {
  await assert.rejects(commandVersion(process.execPath, ['-e', 'process.exit(3)']), { code: 3 });
});

test('envReport: 決まったキーを持つオブジェクトを返す', async () => {
  const r = await envReport();
  assert.deepEqual(Object.keys(r).sort(), ['arch', 'git', 'home', 'node', 'npm', 'platform']);
  assert.equal(r.node, process.version);
  assert.equal(r.platform, process.platform);
  assert.equal(r.arch, process.arch);
  assert.equal(r.home, os.homedir());
  assert.match(r.npm ?? '', /^\d+\.\d+\.\d+/, 'npm のバージョンが入っていません');
});

test('直接実行すると、envReport の結果を JSON で表示する', () => {
  const out = execFileSync(process.execPath, [modulePath], { encoding: 'utf8' });
  const data = JSON.parse(out);
  assert.equal(data.node, process.version);
  assert.ok(out.includes('\n  "node"'), '2文字の字下げになっていません');
});

test('import しただけでは、何も表示しない', () => {
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(modulePath).href)})`], { encoding: 'utf8' });
  assert.equal(out, '');
});
