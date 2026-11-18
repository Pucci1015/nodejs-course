// 練習問題1 のテスト
// 使い方: node --test app-version.test.ts
//   模範解答を試す: MODULE=../solutions/app-version.ts node --test app-version.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './app-version.ts');
const mod: typeof import('./app-version.ts') = await import(pathToFileURL(file).href);
const { appVersion, sameVersion } = mod;

const SHA = '3f9c2a17e5b04d8c9a1e6f2b7d3c5a8e9f0b1c2d';

test('appVersion: APP_VERSION → RENDER_GIT_COMMIT → dev の順', () => {
  assert.equal(appVersion({ APP_VERSION: 'compose', RENDER_GIT_COMMIT: SHA }), 'compose');
  assert.equal(appVersion({ RENDER_GIT_COMMIT: SHA }), SHA);
  assert.equal(appVersion({}), 'dev');
});

test('appVersion: 空の文字は、書いていないのと同じ', () => {
  assert.equal(appVersion({ APP_VERSION: '', RENDER_GIT_COMMIT: SHA }), SHA, 'ARG APP_VERSION= のまま build した');
  assert.equal(appVersion({ APP_VERSION: '', RENDER_GIT_COMMIT: '' }), 'dev');
  assert.equal(appVersion({ APP_VERSION: undefined }), 'dev');
});

test('sameVersion: コミットの ID は、頭が同じなら同じ', () => {
  assert.equal(sameVersion(SHA, SHA), true);
  assert.equal(sameVersion('3f9c2a1', SHA), true, 'git rev-parse --short の 7 文字');
  assert.equal(sameVersion(SHA, '3f9c2a17e5'), true, '逆向きでも');
  assert.equal(sameVersion('3f9c2a2', SHA), false);
  assert.equal(sameVersion('3f9c2a', SHA), false, '6 文字は短すぎる');
  assert.equal(sameVersion('compose', 'compose'), true);
  assert.equal(sameVersion('dev', 'devel'), false, 'コミットの ID でなければ、完全に同じときだけ');
  assert.equal(sameVersion('3F9C2A1', SHA), false, '大文字はコミットの ID ではない');
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
