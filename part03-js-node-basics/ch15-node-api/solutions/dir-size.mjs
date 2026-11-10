// 練習問題9 の解答: フォルダの中のファイルの大きさを合計する（du の小さな版）
// 使い方: node dir-size.mjs <フォルダ>     中のフォルダ・ファイルごとの大きさを、大きい順に表示する
// 確かめ方: cd ../exercises && MODULE=../solutions/dir-size.mjs node --test dir-size.test.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

/** 同時に動かす数を limit 個までにする関数を作る（第12章の mapLimit と同じ考え方を、1つずつの呼び出しに） */
function createLimiter(limit) {
  let running = 0;
  const waiting = [];
  const next = () => {
    if (running >= limit || waiting.length === 0) return;
    running++;
    const { fn, resolve, reject } = waiting.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        running--;
        next();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      waiting.push({ fn, resolve, reject });
      next();
    });
}

export async function dirSize(root, { concurrency = 16 } = {}) {
  const limit = createLimiter(concurrency); // 同時に開くファイルの数を抑える（多すぎると EMFILE）
  const result = { bytes: 0, files: 0, dirs: 0, symlinks: 0, errors: [] };

  // 最初の root だけは、読めなければ例外にする（呼んだ人の間違いなので）
  const rootStat = await fs.lstat(root);
  if (!rootStat.isDirectory()) throw Object.assign(new Error(`フォルダではありません: ${root}`), { code: 'ENOTDIR' });

  async function walk(dir) {
    result.dirs++;
    let entries;
    try {
      entries = await limit(() => fs.readdir(dir, { withFileTypes: true }));
    } catch (err) {
      // 読めないフォルダ（EACCES など）があっても止まらず、記録して続ける
      result.errors.push({ path: dir, code: err.code });
      return;
    }
    await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        // シンボリックリンクはたどらない（たどると、同じものを2回数えたり、輪になって終わらなかったりする）
        if (entry.isSymbolicLink()) {
          result.symlinks++;
          return;
        }
        if (entry.isDirectory()) return walk(full);
        try {
          // lstat: リンクそのものの情報（stat はリンクの先をたどる）
          const st = await limit(() => fs.lstat(full));
          if (st.isFile()) {
            result.files++;
            result.bytes += st.size;
          }
        } catch (err) {
          // 数えている途中で消されたファイルなど
          result.errors.push({ path: full, code: err.code });
        }
      }),
    );
  }

  await walk(root);
  return result;
}

/** 1536 → "1.5 KiB" */
export function formatBytes(bytes) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return i === 0 ? `${value} B` : `${value.toFixed(1)} ${units[i]}`;
}

if (import.meta.main) {
  const root = process.argv[2];
  if (!root) {
    console.error('使い方: node dir-size.mjs <フォルダ>');
    process.exitCode = 2;
  } else {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const rows = await Promise.all(
      entries
        .filter((e) => !e.isSymbolicLink())
        .map(async (e) => {
          const full = path.join(root, e.name);
          if (e.isDirectory()) return { name: `${e.name}/`, ...(await dirSize(full)) };
          const st = await fs.lstat(full);
          return { name: e.name, bytes: st.size, errors: [] };
        }),
    );
    rows.sort((a, b) => b.bytes - a.bytes);
    for (const r of rows) console.log(`${formatBytes(r.bytes).padStart(10)}  ${r.name}`);
    const total = rows.reduce((sum, r) => sum + r.bytes, 0);
    console.log(`${formatBytes(total).padStart(10)}  合計`);
    const errors = rows.flatMap((r) => r.errors);
    for (const e of errors) console.error(`読めなかった: ${e.path}（${e.code}）`);
    if (errors.length > 0) process.exitCode = 1;
  }
}
