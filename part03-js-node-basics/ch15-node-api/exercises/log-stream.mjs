// 練習問題8: 大きなアクセスログ（.gz も）を、少しずつ読みながら集計してください。
// 要件は README と log-stream.test.mjs にあります。
// 確かめ方: node --test log-stream.test.mjs
import { parseLine } from '../../ch11-js-refresher/solutions/log-summary.mjs'; // 第11章 練習問題6（1行を解析する）

/**
 * @param {string} file  ログのファイル（.gz で終わる名前なら gzip で圧縮されている）
 * @param {{ top?: number }} [options]
 * @returns {Promise<{ total: number, invalid: number, byStatusClass: object, bytesTotal: number,
 *                     topPaths: { path: string, count: number }[], first: Date | null, last: Date | null }>}
 */
export async function summarizeLogFile(file, { top = 3 } = {}) {
  // ここを書く
}
