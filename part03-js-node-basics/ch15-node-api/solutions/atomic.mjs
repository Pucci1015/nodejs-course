// 練習問題2 の解答: 途中で落ちても壊れない書き込み（writeFileAtomic）と、取りこぼさない更新（updateJson）
// 確かめ方: cd ../exercises && MODULE=../solutions/atomic.mjs node --test atomic.test.mjs
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * file に data を「全部書けたか、まったく書かなかったか」のどちらかになるように書く。
 * 同じフォルダに一時ファイルを作って書き、最後に rename で置き換える。
 */
export async function writeFileAtomic(file, data, { fsync = true } = {}) {
  // 同じフォルダに作る: rename が「一瞬で置き換える」のは、同じディスク（ファイルシステム）の中だけ
  // 名前に乱数を入れる: 同時に書く人がいても、一時ファイルがぶつからない
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  let handle;
  try {
    handle = await fs.open(tmp, 'wx'); // wx: 万一同じ名前があれば失敗させる（他人のファイルを上書きしない）
    await handle.writeFile(data);
    // fsync: OS のメモリにある書きかけの内容を、ディスクまで書き出す。
    // これをしないと、rename の後に電源が落ちたとき、中身が空のファイルが残ることがある
    if (fsync) await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(tmp, file);
  } catch (err) {
    await handle?.close().catch(() => {});
    await fs.rm(tmp, { force: true }); // 失敗したら、一時ファイルを残さない
    throw err;
  }
}

// ファイルごとの「順番待ちの列」。前の更新が終わってから、次の更新を始める
const queues = new Map();

/**
 * JSON のファイルを読み、updater で変えて、壊れないように書き戻す。
 * 同じプロセスの中で同時に呼ばれても、更新を取りこぼさない。
 */
export function updateJson(file, updater, { defaultValue = {} } = {}) {
  const key = path.resolve(file);
  const previous = queues.get(key) ?? Promise.resolve();
  // 前の更新が失敗しても、次の更新は始める（then の2つ目の引数で、失敗を飲み込んでから続ける）
  const current = previous.then(run, run);
  // 列が伸び続けないように、自分が最後なら片付ける
  const tail = current.catch(() => {});
  queues.set(key, tail);
  tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return current;

  async function run() {
    let value;
    try {
      value = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err; // 壊れた JSON や読めないファイルは、黙って上書きしない
      value = structuredClone(defaultValue);
    }
    const next = await updater(value);
    await writeFileAtomic(file, `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }
}
