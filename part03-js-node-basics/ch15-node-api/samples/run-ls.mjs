// 第15章 8.2節で書く、別のプログラム（ls）を動かすプログラムの完成形
// 使い方（~/dev/part03/ch15-node-api で）: node samples/run-ls.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile); // Promise を返す版にする（第12章）

const { stdout } = await execFileAsync('ls', ['-1', 'samples']);
console.log('samples の中:', stdout.trim().split('\n'));

try {
  await execFileAsync('ls', ['no-such-dir']);
} catch (err) {
  console.log('失敗したとき: 終了コード', err.code, '/', err.stderr.trim());
}
