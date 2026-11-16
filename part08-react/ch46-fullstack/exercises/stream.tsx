// 第46章 練習問題8: 遅いデータを待つ部分だけ、後から送る（本文6節）
import type { Writable } from 'node:stream';

export type Stats = { total: number; done: number };

export function streamStats(stats: Promise<Stats>, out: Writable): void {
  throw new Error('まだ書いていません');
}
