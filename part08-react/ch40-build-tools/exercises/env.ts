// 第40章 練習問題2: import.meta.env を Zod で確かめて、使いやすい形にする
import { z } from 'zod';

export class EnvError extends Error {
  readonly names: string[];
  constructor(names: string[]) {
    super(`環境変数が正しくありません: ${names.join(', ')}`);
    this.name = 'EnvError';
    this.names = names;
  }
}

export type AppEnv = { apiBase: string; pollMs: number; featureStats: boolean };

/** ふつうは readEnv(import.meta.env) と呼ぶ */
export function readEnv(env: Record<string, unknown>): AppEnv {
  throw new Error('まだ書いていません');
}

void z; // 使い始めたら、この行は消してよい
