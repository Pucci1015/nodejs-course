// 練習問題6: 設定を、既定の値 < 設定ファイル < 環境変数 < コマンドラインの引数 の順に重ねる
// 仕様は README の練習問題6を見てください。
// 確かめる: node --test load-config.test.mjs
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

// flags: コマンドラインの引数を解析したもの { dir, editor, color, config }（無いものは undefined）
// env・home・cwd: テストで差し替えられるように、引数で受け取る
export function loadConfig({ flags = {}, env = process.env, home = os.homedir(), cwd = process.cwd() } = {}) {
  // ここを書く
  // 返すもの: { config: { dir, editor, color }, sources: { dir, editor, color }, configFile, fileLoaded, warnings }
  throw new Error('まだ書いていません');
}
