// 第66章 練習問題7: ロードバランサの、台を選ぶ部分。続けて失敗した台を、しばらく休ませる（本文 7.1節）

export type PoolOptions = {
  /** 続けて何回失敗したら休ませるか */
  failThreshold: number;
  /** 休ませる時間（ミリ秒） */
  cooldownMs: number;
  now?: () => number;
};

export type TargetPool = {
  /** 次の台（元気なものを順番に）。全部休んでいれば undefined */
  pick(): string | undefined;
  reportSuccess(target: string): void;
  reportFailure(target: string): void;
  /** 台ごとの { target, up, failures } */
  status(): { target: string; up: boolean; failures: number }[];
};

type State = { target: string; failures: number; downUntil: number };

export function createTargetPool(targets: string[], options: PoolOptions): TargetPool {
  if (targets.length === 0) throw new Error('targets が空です');
  if (new Set(targets).size !== targets.length) throw new Error('targets に同じ台があります');
  const now = options.now ?? Date.now;
  const states: State[] = targets.map((target) => ({ target, failures: 0, downUntil: 0 }));
  let next = 0;

  const isUp = (s: State) => s.downUntil <= now();
  const find = (target: string) => states.find((s) => s.target === target);

  return {
    pick() {
      for (let i = 0; i < states.length; i += 1) {
        const s = states[(next + i) % states.length];
        if (s && isUp(s)) {
          next = (next + i + 1) % states.length;
          return s.target;
        }
      }
      return undefined;
    },
    reportSuccess(target) {
      const s = find(target);
      if (s) s.failures = 0; // 続けての失敗は、成功で数え直す
    },
    reportFailure(target) {
      const s = find(target);
      if (!s) return;
      s.failures += 1;
      if (s.failures >= options.failThreshold) {
        s.downUntil = now() + options.cooldownMs;
        // 休みが明けたら、1 回だけ試す（半開き）。そこで失敗したら、すぐまた休ませる
        s.failures = options.failThreshold - 1;
      }
    },
    status() {
      return states.map((s) => ({ target: s.target, up: isUp(s), failures: s.failures }));
    },
  };
}
