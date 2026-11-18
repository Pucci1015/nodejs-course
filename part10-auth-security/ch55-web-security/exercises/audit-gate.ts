// 第55章 練習問題8: npm audit --json の結果をまとめて、基準をこえたら終了コード 1（本文9節）
// 使い方: npm audit --json | node audit-gate.ts --level high
import { z } from 'zod';

export const SEVERITIES = ['info', 'low', 'moderate', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];
export type Counts = Record<Severity | 'total', number>;
export type Finding = {
  name: string;
  severity: Severity;
  isDirect: boolean;
  advisories: { title: string; url: string }[];
  via: string[];
  fix: string;
};

export function summarize(report: unknown): { counts: Counts; findings: Finding[] } {
  // ここを書く
  void z;
  throw new Error(`まだ書いていません: ${typeof report}`);
}

export function exceeds(counts: Counts, level: Severity): boolean {
  // ここを書く
  throw new Error(`まだ書いていません: ${counts.total} ${level}`);
}

// コマンドとして動かしたとき（ここを書く）
if (import.meta.main) {
  console.error('まだ書いていません');
  process.exitCode = 2;
}
