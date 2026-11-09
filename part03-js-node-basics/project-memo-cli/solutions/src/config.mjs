// 設定を、既定の値 < 設定ファイル < 環境変数 < コマンドラインの引数 の順に重ねる（第16章 練習問題6）
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const APP = 'memo';

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
    this.exitCode = 2;
  }
}

// "~" と "~/..." だけを、ホームフォルダに置き換える（"~user" はシェルの機能なので扱わない）
function expandHome(p, home) {
  if (p === '~') return home;
  if (p.startsWith('~/')) return path.join(home, p.slice(2));
  return p;
}

// 空の文字列は「設定されていない」として扱う
const envValue = (env, name) => (env[name] === undefined || env[name] === '' ? undefined : env[name]);

export function configFilePath({ env = process.env, home = os.homedir() } = {}, warnings = []) {
  let base = envValue(env, 'XDG_CONFIG_HOME');
  // XDG Base Directory の決まり: 相対パスは無効なので無視する
  if (base !== undefined && !path.isAbsolute(base)) {
    warnings.push(`XDG_CONFIG_HOME が相対パスなので無視します: ${base}`);
    base = undefined;
  }
  return path.join(base ?? path.join(home, '.config'), APP, 'config.json');
}

const FILE_KEYS = {
  dir: (v) => typeof v === 'string' && v !== '',
  editor: (v) => typeof v === 'string' && v.trim() !== '',
  color: (v) => typeof v === 'boolean',
};
const KEY_HINT = { dir: '空でない文字列', editor: '空でない文字列', color: 'true か false' };

function readConfigFile(file, required) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT' && !required) return null; // 既定の場所に無いのは普通
    throw new ConfigError(`設定ファイルを読めません: ${file}（${err.code ?? err.message}）`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new ConfigError(`設定ファイルが正しい JSON ではありません: ${file}（${err.message}）`);
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new ConfigError(`設定ファイルの中身はオブジェクト（{ ... }）にしてください: ${file}`);
  }
  return data;
}

export function loadConfig({ flags = {}, env = process.env, home = os.homedir(), cwd = process.cwd() } = {}) {
  const warnings = [];
  const config = { dir: path.join(home, 'memos'), editor: 'vi', color: true };
  const sources = { dir: 'default', editor: 'default', color: 'default' };
  const set = (key, value, source) => {
    config[key] = value;
    sources[key] = source;
  };

  // 1. 設定ファイル
  const required = flags.config !== undefined;
  const configFile = required ? path.resolve(cwd, expandHome(flags.config, home)) : configFilePath({ env, home }, warnings);
  const data = readConfigFile(configFile, required);
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (!Object.hasOwn(FILE_KEYS, key)) {
        warnings.push(`${configFile}: 知らない設定です: ${key}`);
        continue;
      }
      if (!FILE_KEYS[key](value)) throw new ConfigError(`${configFile}: ${key} は${KEY_HINT[key]}にしてください`);
      // 設定ファイルの中の相対パスは、設定ファイルのあるフォルダから
      set(key, key === 'dir' ? path.resolve(path.dirname(configFile), expandHome(value, home)) : value, 'file');
    }
  }

  // 2. 環境変数
  const memoDir = envValue(env, 'MEMO_DIR');
  if (memoDir !== undefined) set('dir', path.resolve(cwd, expandHome(memoDir, home)), 'env');
  const editor = envValue(env, 'MEMO_EDITOR') ?? envValue(env, 'VISUAL') ?? envValue(env, 'EDITOR');
  if (editor !== undefined) set('editor', editor, 'env');
  if (envValue(env, 'NO_COLOR') !== undefined) set('color', false, 'env');

  // 3. コマンドラインの引数
  if (flags.dir !== undefined) set('dir', path.resolve(cwd, expandHome(flags.dir, home)), 'args');
  if (flags.editor !== undefined) set('editor', flags.editor, 'args');
  if (flags.color === false) set('color', false, 'args');

  return { config, sources, configFile, fileLoaded: data !== null, warnings };
}
