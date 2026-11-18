// 第65章 練習問題2: Cache-Control を分ける（"…" の中のカンマにも対応）と、CDN が覚えてよい秒数（本文 2節）

/** Cache-Control の値を、名前（小文字）→ 値（無ければ ''）の Map にする */
export function parseCacheControl(value: string | undefined): Map<string, string> {
  // ここを書く
  throw new Error(`まだ書いていません（${value}）`);
}

/** 共有キャッシュ（CDN）が新鮮とみなしてよい秒数。覚えてはいけないなら undefined */
export function sharedLifetime(value: string | undefined): number | undefined {
  // ここを書く
  throw new Error(`まだ書いていません（${value}）`);
}
