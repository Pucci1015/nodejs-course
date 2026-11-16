// 第48章 練習問題のテストで使う道具（このファイルは変えません）
import { readFileSync } from 'node:fs';

/** ファイルの最初の行が 'use client'（または "use client"）か */
export function startsWithUseClient(path: string): boolean {
  const first = readFileSync(path, 'utf8').split('\n')[0]?.trim() ?? '';
  return /^(['"])use client\1;?$/.test(first);
}
