// 練習問題3: 開発の環境（Node.js・npm・git のバージョンなど）を調べて、JSON で表示する CLI を作ってください。
// 要件は README と env-report.test.mjs にあります。
// 使い方: node env-report.mjs
// 確かめ方: node --test env-report.test.mjs
import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// コマンドを「cmd --version」のように動かし、出力の前後の空白を取って返す。
// コマンドが見つからない（err.code が 'ENOENT'）ときは null を返す。それ以外の失敗は、そのまま投げる
export async function commandVersion(cmd, args = ['--version']) {
  // ここを書く
}

// 次の形のオブジェクトを返す
//   { node: 'v24.x.x', npm: '11.x.x', git: 'git version 2.x.x', platform: 'darwin', arch: 'arm64', home: '/Users/...' }
// node は process.version、platform は process.platform、arch は process.arch、home は os.homedir() を使う
export async function envReport() {
  // ここを書く
}

// node env-report.mjs のように直接実行したときだけ、JSON を表示する（2文字の字下げ）
if (import.meta.main) {
  // ここを書く
}
