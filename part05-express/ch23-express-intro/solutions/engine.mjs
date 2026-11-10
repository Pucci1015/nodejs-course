// 練習問題8の模範解答: 第21章のテンプレートエンジンを、Express のビューエンジンにする
import fs from 'node:fs/promises';
import path from 'node:path';
import { compile } from '../../lib/template.mjs';

// 追加: Express が値に混ぜてくるもの。テンプレートには見せない
//   settings … app.set の値すべて（views のフォルダ、env など）
//   _locals  … res.locals そのもの（値は、もう options に混ざっている）
//   cache    … view cache が有効かどうか
const HIDDEN = new Set(['settings', '_locals', 'cache', 'layout']);

/**
 * @param {{ readFile?: (file: string, encoding: 'utf8') => Promise<string> }} [options]
 */
export function createEngine({ readFile = fs.readFile } = {}) {
  // 追加: ファイルのパス → compile の結果（Promise）。Promise を入れておくと、同時に来ても読むのは1回
  const cache = new Map();

  async function load(file, useCache) {
    if (!useCache) return compileFile(file);
    if (!cache.has(file)) {
      const p = compileFile(file);
      cache.set(file, p);
      p.catch(() => cache.delete(file)); // 追加: 失敗したものは覚えない（直したら次から使える）
    }
    return cache.get(file);
  }

  async function compileFile(file) {
    const source = await readFile(file, 'utf8');
    try {
      return compile(source);
    } catch (err) {
      // 追加: どのファイルの誤りかが分かるように、名前を付ける
      err.message = `${path.basename(file)}: ${err.message}`;
      throw err;
    }
  }

  return async (filePath, options, callback) => {
    try {
      const useCache = Boolean(options.cache); // app.set('view cache', true) のとき（production では既定で true）
      const data = {};
      for (const [k, v] of Object.entries(options)) if (!HIDDEN.has(k)) data[k] = v;

      const page = (await load(filePath, useCache))(data);
      if (!options.layout) return callback(null, page);

      // 追加: レイアウトは、テンプレートと同じフォルダの中のファイルだけ（第19章 2節と同じ確かめ方）
      const dir = path.dirname(filePath);
      const layoutPath = path.resolve(dir, String(options.layout));
      const rel = path.relative(dir, layoutPath);
      if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`レイアウトはテンプレートと同じフォルダの中に置いてください: ${options.layout}`);
      }
      const layout = await load(layoutPath, useCache);
      // body は「もうエスケープ済みの HTML」なので、レイアウトでは {{ body | raw }} と書いて入れる
      callback(null, layout({ ...data, body: page }));
    } catch (err) {
      callback(err); // Express のエラーハンドラへ
    }
  };
}
