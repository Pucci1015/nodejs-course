// 第70章 練習問題5: 公開したアプリを、外から一通り確かめるコマンド（本文 3.3節）
// 使い方: node smoke.ts <URL>       例: node smoke.ts http://127.0.0.1:9913
// 終了コード: 0 すべて成功 / 1 失敗があった / 2 使い方の間違い

/** 確かめること。どれも GET。ok は、合っていれば null、違えば「何が違うか」の文 */
export const CHECKS: { path: string; ok: (res: Response, body: string) => string | null }[] = [
  // ここを書く: 次の5つ
  // /healthz      … 200
  // /readyz       … 200 で、JSON の status が 'ready'
  // /version      … 200 で、JSON の version が空でない文字
  // /             … 200 で、Content-Type が text/html で始まる（画面が配られている）
  // /api/auth/me  … 401（ログインしていなければ断る）
];

/**
 * コマンドの本体。終了コードを返す
 * - 引数が URL 1つでなければ、使い方を console.error に出して 2
 * - CHECKS を順に1つずつ確かめ、1行ずつ console.log に出す
 *     合っていれば '[OK] /healthz'、違えば '[NG] /readyz: 503（200 のはず）' のように、理由を付ける
 *     つながらない・5 秒たっても応答が無いときも NG（例外で止まらない）
 * - 最後の行は、全部合っていれば 'すべて成功しました'（0）、違えば 'N 件失敗しました'（1）
 */
export async function main(argv: string[]): Promise<number> {
  // ここを書く
  throw new Error(`まだ書いていません（${argv.length}）`);
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
