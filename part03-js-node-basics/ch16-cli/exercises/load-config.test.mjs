// 練習問題6のテスト。本物のホームフォルダや環境変数は使わない
// 使い方: node --test load-config.test.mjs
//         MODULE=../solutions/load-config.mjs node --test load-config.test.mjs   （解答例で確かめる）
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { loadConfig, ConfigError } = await import(
  pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './load-config.mjs')).href
);

let root, home, cwd;
beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ch16-config-')));
  home = path.join(root, 'home');
  cwd = path.join(root, 'work');
  fs.mkdirSync(home);
  fs.mkdirSync(cwd);
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

function writeConfig(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
}
const defaultFile = () => path.join(home, '.config', 'memo', 'config.json');
const load = (opts = {}) => loadConfig({ flags: {}, env: {}, home, cwd, ...opts });

function configError(fn, re) {
  assert.throws(fn, (err) => {
    assert.ok(err instanceof ConfigError, String(err));
    assert.equal(err.exitCode, 2);
    assert.match(err.message, re);
    return true;
  });
}

test('何も無ければ既定の値。設定ファイルが無いのはエラーではない', () => {
  const r = load();
  assert.deepEqual(r.config, { dir: path.join(home, 'memos'), editor: 'vi', color: true });
  assert.deepEqual(r.sources, { dir: 'default', editor: 'default', color: 'default' });
  assert.equal(r.configFile, defaultFile());
  assert.equal(r.fileLoaded, false);
  assert.deepEqual(r.warnings, []);
});

test('~/.config/memo/config.json を読む', () => {
  writeConfig(defaultFile(), { editor: 'code --wait', color: false });
  const r = load();
  assert.deepEqual(r.config, { dir: path.join(home, 'memos'), editor: 'code --wait', color: false });
  assert.deepEqual(r.sources, { dir: 'default', editor: 'file', color: 'file' });
  assert.equal(r.fileLoaded, true);
});

test('XDG_CONFIG_HOME があれば、そこから探す。相対パスなら無視して警告', () => {
  const xdg = path.join(root, 'xdg');
  writeConfig(path.join(xdg, 'memo', 'config.json'), { editor: 'nano' });
  assert.equal(load({ env: { XDG_CONFIG_HOME: xdg } }).config.editor, 'nano');

  writeConfig(defaultFile(), { editor: 'vim' });
  const r = load({ env: { XDG_CONFIG_HOME: 'relative/xdg' } });
  assert.equal(r.config.editor, 'vim');
  assert.equal(r.configFile, defaultFile());
  assert.match(r.warnings.join('\n'), /XDG_CONFIG_HOME/);
});

test('設定ファイルの dir: ~ を展開する。相対パスは設定ファイルのフォルダから', () => {
  writeConfig(defaultFile(), { dir: '~/notes' });
  assert.equal(load().config.dir, path.join(home, 'notes'));
  writeConfig(defaultFile(), { dir: '../data' });
  assert.equal(load().config.dir, path.join(home, '.config', 'data'));
});

test('環境変数: MEMO_DIR、エディタは MEMO_EDITOR > VISUAL > EDITOR、NO_COLOR', () => {
  writeConfig(defaultFile(), { dir: '/from/file', editor: 'vim', color: true });
  const r = load({ env: { MEMO_DIR: 'm', VISUAL: 'code -w', EDITOR: 'nano', NO_COLOR: '1' } });
  assert.deepEqual(r.config, { dir: path.join(cwd, 'm'), editor: 'code -w', color: false }); // 相対パスは cwd から
  assert.deepEqual(r.sources, { dir: 'env', editor: 'env', color: 'env' });
  assert.equal(load({ env: { MEMO_EDITOR: 'emacs', VISUAL: 'code -w', EDITOR: 'nano' } }).config.editor, 'emacs');
  assert.equal(load({ env: { EDITOR: 'nano' } }).config.editor, 'nano');
  assert.equal(load({ env: { MEMO_DIR: '~/x' } }).config.dir, path.join(home, 'x'));
});

test('空の環境変数は、設定されていないのと同じ', () => {
  writeConfig(defaultFile(), { editor: 'vim' });
  const r = load({ env: { MEMO_DIR: '', MEMO_EDITOR: '', VISUAL: '', EDITOR: '', NO_COLOR: '' } });
  assert.deepEqual(r.config, { dir: path.join(home, 'memos'), editor: 'vim', color: true });
});

test('引数がいちばん強い', () => {
  writeConfig(defaultFile(), { dir: '/from/file', editor: 'vim' });
  const r = load({ env: { MEMO_DIR: '/from/env', EDITOR: 'nano' }, flags: { dir: 'here', editor: 'ed', color: false } });
  assert.deepEqual(r.config, { dir: path.join(cwd, 'here'), editor: 'ed', color: false });
  assert.deepEqual(r.sources, { dir: 'args', editor: 'args', color: 'args' });
});

test('--config で設定ファイルを指定する。そのときは無ければエラー', () => {
  writeConfig(path.join(cwd, 'my.json'), { editor: 'micro' });
  const r = load({ flags: { config: 'my.json' } });
  assert.equal(r.config.editor, 'micro');
  assert.equal(r.configFile, path.join(cwd, 'my.json'));
  configError(() => load({ flags: { config: 'nai.json' } }), /nai\.json/);
});

test('壊れた設定ファイルはエラー。ファイルの場所をメッセージに入れる', () => {
  writeConfig(defaultFile(), '{ "editor": "vim", }');
  configError(() => load(), /config\.json.*JSON|JSON.*config\.json/s);
  writeConfig(defaultFile(), '["vim"]');
  configError(() => load(), /オブジェクト/);
  writeConfig(defaultFile(), 'null');
  configError(() => load(), /オブジェクト/);
});

test('型の違う値はエラー。知らない設定は警告だけ', () => {
  writeConfig(defaultFile(), { color: 'no' });
  configError(() => load(), /color/);
  writeConfig(defaultFile(), { dir: 3 });
  configError(() => load(), /dir/);
  writeConfig(defaultFile(), { colour: false, editor: 'vim' });
  const r = load();
  assert.equal(r.config.editor, 'vim');
  assert.equal(r.config.color, true);
  assert.match(r.warnings.join('\n'), /colour/);
});

test('process.env を書き換えない', () => {
  const env = { EDITOR: 'nano' };
  load({ env });
  assert.deepEqual(env, { EDITOR: 'nano' });
});
