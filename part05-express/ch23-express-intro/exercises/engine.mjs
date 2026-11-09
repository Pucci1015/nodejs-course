// 練習問題5: 第21章のテンプレートエンジンを、Express のビューエンジンにする
// 本文 7節の view-engine-demo.mjs は、毎回ファイルを読んで compile していました。
// これを、キャッシュ・レイアウト・エラーの扱いのある部品にしてください。要件は exercises/README.md の問題5です。
//   $ node --test engine.test.mjs
import fs from 'node:fs/promises';
import { compile } from '../../lib/template.mjs';

/**
 * @param {{ readFile?: (file: string, encoding: 'utf8') => Promise<string> }} [options]
 * @returns {(filePath: string, options: object, callback: (err: Error | null, html?: string) => void) => void}
 */
export function createEngine({ readFile = fs.readFile } = {}) {
  return async (filePath, options, callback) => {
    // ここを書く: キャッシュ、settings などを渡さない、レイアウト、エラーにファイル名を付ける
    try {
      const source = await readFile(filePath, 'utf8');
      callback(null, compile(source)(options));
    } catch (err) {
      callback(err);
    }
  };
}
