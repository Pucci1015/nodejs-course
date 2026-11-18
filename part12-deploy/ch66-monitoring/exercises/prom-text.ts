// 第66章 練習問題3: カウンタを、Prometheus の文字の形にする（ラベルの値のエスケープ）（本文 3.2節）

export type Sample = { labels: Record<string, string>; value: number };

export function formatCounter(name: string, help: string, samples: Sample[]): string {
  // ここを書く
  throw new Error(`まだ書いていません（${name} ${help} ${samples.length}）`);
}
