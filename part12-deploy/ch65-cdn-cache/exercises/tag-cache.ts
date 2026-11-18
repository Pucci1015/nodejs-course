// 第65章 練習問題8: アプリの中の小さなキャッシュ。古いものをすぐ返して後ろで取り直す・同時の読み込みをまとめる・印で消す（本文 3・7節）

export type Loaded<T> = {
  value: T;
  /** 新鮮な時間（ミリ秒） */
  ttlMs: number;
  /** 新鮮でなくなってから、古いものを返してよい時間（ミリ秒）。無ければ 0 */
  swrMs?: number;
  /** 印 */
  tags?: string[];
};

export type TagCache<T> = {
  /** key の値。無いか古すぎれば load を呼ぶ */
  get(key: string, load: () => Promise<Loaded<T>>): Promise<T>;
  purgeKey(key: string): void;
  purgeTag(tag: string): void;
  /** 数えたもの: hit（新鮮）・stale（古いものを返した）・miss（load を待った） */
  stats(): { hit: number; stale: number; miss: number };
};

/** 値の型が T のキャッシュを作る */
export function createTagCache<T>(options: { now?: () => number } = {}): TagCache<T> {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof options}）`);
}
