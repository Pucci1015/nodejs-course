// 別のプログラムを動かす: child_process（第15章 8.4節）
// 使い方: node child-demo.mjs
//   OS の一時フォルダに ch15-child-demo を作って試し、最後に消す。
import { exec, execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const dir = path.join(os.tmpdir(), 'ch15-child-demo');
await fs.rm(dir, { recursive: true, force: true });
await fs.mkdir(dir);

// 1. execFile: プログラムと引数を「配列」で渡す。シェルを通さない
const { stdout } = await execFileAsync('ls', ['-1', '/'], { cwd: dir });
console.log('1. execFile("ls", ["-1", "/"]) の最初の3行:', stdout.split('\n').slice(0, 3));

// 2. 終了コードが 0 以外だと、reject される。err.code に終了コード、err.stderr に標準エラー出力
try {
  await execFileAsync('ls', ['/no/such/dir']);
} catch (err) {
  console.log('2. 失敗したとき: code =', err.code, '/ stderr =', err.stderr.trim().slice(0, 60));
}

// 3. 利用者が決めたファイル名を、コマンドの文字列に埋め込むと…
const name = 'report.txt; echo "!!! ファイル名に書かれたコマンドが実行された !!!"';
await fs.writeFile(path.join(dir, name), 'a\nb\n');
const viaShell = await execAsync(`wc -l ${name}`, { cwd: dir }).catch((err) => err);
console.log('3. exec（シェルを通す）:', viaShell.stdout.trim().split('\n'));

// 4. execFile なら、ファイル名はただの1つの引数として渡る
const viaFile = await execFileAsync('wc', ['-l', name], { cwd: dir });
console.log('4. execFile（シェルを通さない）:', viaFile.stdout.trim());

// 5. spawn: 出力をストリームで少しずつ受け取る（大きな出力、長く動くプログラム向け）
const child = spawn(process.execPath, ['-e', 'for (let i = 1; i <= 3; i++) setTimeout(() => console.log("tick", i), i * 50)']);
child.stdout.on('data', (chunk) => process.stdout.write(`5. spawn の出力: ${chunk}`));
const [code] = await new Promise((resolve) => child.once('close', (...args) => resolve(args)));
console.log('5. 終了コード:', code);

// 6. timeout: 時間がかかりすぎたら止める
try {
  await execFileAsync(process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], { timeout: 200 });
} catch (err) {
  console.log('6. timeout で止めた: killed =', err.killed, '/ signal =', err.signal);
}

await fs.rm(dir, { recursive: true });
