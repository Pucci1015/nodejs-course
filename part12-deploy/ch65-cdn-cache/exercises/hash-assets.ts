// 第65章 練習問題6: ファイルの名前に中身のハッシュを入れ、HTML の中の参照を書き換える（本文 5.1節）

export type HashResult = {
  /** 書き換えた HTML */
  html: string;
  /** 新しい名前 → 中身 */
  files: Record<string, string>;
  /** 元の名前 → 新しい名前 */
  manifest: Record<string, string>;
};

/**
 * assets は「assets/app.js」のような名前 → 中身。
 * html の中の "/assets/app.js"（" で囲まれたもの）を、"/assets/app.（8 文字）.js" に書き換える
 */
export function hashAssets(html: string, assets: Record<string, string>): HashResult {
  // ここを書く
  throw new Error(`まだ書いていません（${html.length} ${Object.keys(assets).length}）`);
}
