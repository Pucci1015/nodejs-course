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

export function createTargetPool(targets: string[], options: PoolOptions): TargetPool {
  // ここを書く
  throw new Error(`まだ書いていません（${targets.length} ${typeof options}）`);
}
