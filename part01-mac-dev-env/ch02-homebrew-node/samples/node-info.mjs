// 実行中の Node.js について、調べておきたい情報を表示する（第2章）
// 使い方: node node-info.mjs
import os from 'node:os';

const info = {
  'Node.js のバージョン': process.version,
  'LTS のコードネーム': process.release.lts ?? '（LTS ではありません）',
  'V8（JavaScript エンジン）': process.versions.v8,
  'libuv（非同期 I/O ライブラリ）': process.versions.uv,
  'OS（platform）': process.platform, // macOS なら 'darwin'
  'CPU（arch）': process.arch, // Apple Silicon ネイティブなら 'arm64'
  'CPU のコア数': os.availableParallelism(),
  '実行ファイルの場所': process.execPath,
  'カレントディレクトリ': process.cwd(),
};

// console.table は、オブジェクトを表の形で表示する
console.table(info);
