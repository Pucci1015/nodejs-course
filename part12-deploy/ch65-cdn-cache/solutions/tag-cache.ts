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

type Entry<T> = { value: T; storedAt: number; ttlMs: number; swrMs: number; tags: string[] };

/** 値の型が T のキャッシュを作る */
export function createTagCache<T>(options: { now?: () => number } = {}): TagCache<T> {
  const now = options.now ?? Date.now;
  const entries = new Map<string, Entry<T>>();
  // 読み込み中の Promise。同じ key の読み込みを 1 つにまとめる。
  // generation は、読み込み中に消された（purge）とき、その結果を覚えないための番号
  const loading = new Map<string, Promise<T>>();
  const generation = new Map<string, number>();
  const counts = { hit: 0, stale: 0, miss: 0 };

  function genOf(key: string): number {
    return generation.get(key) ?? 0;
  }

  function startLoad(key: string, load: () => Promise<Loaded<T>>): Promise<T> {
    const running = loading.get(key);
    if (running) return running;
    const gen = genOf(key);
    const p = load()
      .then((loaded) => {
        // 読み込んでいる間に消されていなければ、覚える
        if (genOf(key) === gen) {
          entries.set(key, {
            value: loaded.value,
            storedAt: now(),
            ttlMs: loaded.ttlMs,
            swrMs: loaded.swrMs ?? 0,
            tags: loaded.tags ?? [],
          });
        }
        return loaded.value;
      })
      .finally(() => {
        if (loading.get(key) === p) loading.delete(key);
      });
    loading.set(key, p);
    return p;
  }

  function purgeKey(key: string): void {
    entries.delete(key);
    generation.set(key, genOf(key) + 1); // 読み込み中のものがあれば、その結果を覚えない
    loading.delete(key);
  }

  return {
    async get(key, load) {
      const e = entries.get(key);
      if (e) {
        const age = now() - e.storedAt;
        if (age < e.ttlMs) {
          counts.hit += 1;
          return e.value;
        }
        if (age < e.ttlMs + e.swrMs) {
          counts.stale += 1;
          // 後ろで取り直す。失敗しても、古いものを持ち続ける（例外を外に出さない）
          startLoad(key, load).catch(() => {});
          return e.value;
        }
      }
      counts.miss += 1;
      return startLoad(key, load);
    },
    purgeKey,
    purgeTag(tag) {
      for (const [key, e] of entries) if (e.tags.includes(tag)) purgeKey(key);
    },
    stats() {
      return { ...counts };
    },
  };
}
