// 第70章 練習問題7: README と docs の、切れたリンクを探すコマンド（本文 7.2節）
// 使い方: node check-links.ts <フォルダ>     例: node check-links.ts ~/dev/room-booking
// 終了コード: 0 切れたリンクが無い / 1 切れたリンクがある / 2 使い方の間違い・フォルダが無い

export interface Broken {
  file: string; // フォルダから見た .md のパス（区切りは /。例 'docs/README.md'）
  line: number; // 行の番号（1 から）
  target: string; // リンクに書いてあった行き先（そのまま）
}

/**
 * フォルダの中の .md を全部読み、行き先のファイルやフォルダが無いリンクを返す
 * - 下のフォルダもたどる。ただし node_modules と、. で始まるフォルダ（.git など）の中は見ない
 * - リンクは [文字](行き先) と ![文字](行き先)。行き先が http:・https:・mailto:・# で始まるものは調べない
 * - 行き先の # から後ろは取り、%E3%81… のような書き方は元の文字に戻してから、.md のあるフォルダから探す
 * - ``` で囲んだコードのブロックの中と、`…` のコードの中は、リンクとみなさない
 * - file の順、同じファイルの中は line の順
 */
export async function findBrokenLinks(root: string): Promise<Broken[]> {
  // ここを書く
  throw new Error(`まだ書いていません（${root}）`);
}

/**
 * コマンドの本体。終了コードを返す
 * - 引数がフォルダ1つでなければ、使い方を console.error に出して 2（フォルダが無いときも 2）
 * - 切れたリンクを 'docs/README.md:12: adr/0002.md が見つかりません' の形で1行ずつ console.log に出す
 * - 最後の行は、無ければ '切れたリンクはありません'（0）、あれば 'N 個のリンクが切れています'（1）
 */
export async function main(argv: string[]): Promise<number> {
  // ここを書く
  throw new Error(`まだ書いていません（${argv.length}）`);
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
