// 設定の優先順位: コマンドラインの引数 > 環境変数 > 設定ファイル > 既定の値（第16章 9節）
// 使い方:
//   node config-demo.mjs
//   DEMO_EDITOR=nano node config-demo.mjs
//   DEMO_EDITOR=nano node config-demo.mjs --editor vim
//   XDG_CONFIG_HOME=/tmp/xdg node config-demo.mjs     （設定ファイルを探す場所を変える）
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

const APP = 'demo-cli';
const defaults = { editor: 'vi', dir: path.join(os.homedir(), 'memos'), color: true };

// XDG Base Directory の決まり: $XDG_CONFIG_HOME が無ければ ~/.config
const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
const configFile = path.join(configHome, APP, 'config.json');
let fromFile = {};
try {
  fromFile = JSON.parse(fs.readFileSync(configFile, 'utf8'));
} catch (err) {
  if (err.code !== 'ENOENT') throw err; // 無いのは普通。壊れているのはエラー
}

const fromEnv = {};
if (process.env.DEMO_EDITOR) fromEnv.editor = process.env.DEMO_EDITOR;
if (process.env.DEMO_DIR) fromEnv.dir = process.env.DEMO_DIR;
if (process.env.NO_COLOR) fromEnv.color = false;

const { values } = parseArgs({ options: { editor: { type: 'string' }, dir: { type: 'string' }, 'no-color': { type: 'boolean' } } });
const fromArgs = {};
if (values.editor) fromArgs.editor = values.editor;
if (values.dir) fromArgs.dir = values.dir;
if (values['no-color']) fromArgs.color = false;

// 右に書いたものほど強い
const config = { ...defaults, ...fromFile, ...fromEnv, ...fromArgs };
console.log('設定ファイル:', configFile, fs.existsSync(configFile) ? '（あった）' : '（無い）');
console.log({ defaults, fromFile, fromEnv, fromArgs });
console.log('結果:', config);
