// 第49章 練習問題のテストで使う道具（このファイルは変えません）
import { readFileSync } from 'node:fs';

/** ファイルの最初の行が 'use server' や 'use client'（"…" でもよい）か */
export function startsWithDirective(path: string, directive: 'use server' | 'use client'): boolean {
  const first = readFileSync(path, 'utf8').split('\n')[0]?.trim() ?? '';
  return new RegExp(`^(['"])${directive}\\1;?$`).test(first);
}
