// 途中で落ちても壊れない書き込み（第15章 練習問題5）
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function tmpNameFor(file) {
  return path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`);
}

async function writeTmp(file, data) {
  const tmp = tmpNameFor(file);
  const fh = await fs.open(tmp, 'wx');
  try {
    await fh.writeFile(data);
    await fh.sync();
  } catch (err) {
    await fh.close();
    await fs.rm(tmp, { force: true });
    throw err;
  }
  await fh.close();
  return tmp;
}

// 一時ファイルに書いて rename で置き換える。前からあるファイルは上書きする
export async function writeFileAtomic(file, data) {
  const tmp = await writeTmp(file, data);
  try {
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
}

// 一時ファイルに書いて link で名前を付ける。すでにあれば EEXIST で失敗する（上書きしない）
// link は「名前が無いときだけ付ける」を1回の操作で行うので、2つのプロセスが同時に同じ名前で作ろうとしても、片方だけが成功する
export async function createFileExclusive(file, data) {
  const tmp = await writeTmp(file, data);
  try {
    await fs.link(tmp, file);
  } catch (err) {
    if (!['EPERM', 'ENOTSUP', 'ENOSYS'].includes(err.code)) throw err;
    // ハードリンクが使えないファイルシステム（一部の USB メモリなど）: wx で開いて書く
    await fs.writeFile(file, data, { flag: 'wx' });
  } finally {
    await fs.rm(tmp, { force: true });
  }
}
