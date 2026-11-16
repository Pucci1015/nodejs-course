// 第50章 練習問題5・8の模範解答: タスクの数を読む関数
import { cacheLife, cacheTag } from 'next/cache';
import { listTasks } from './api.ts';

/** 問題5: タスクの数。名札 'tasks' を付けて、1時間覚えておく */
export async function getTaskCount(): Promise<number> {
  'use cache';
  cacheLife('hours');
  cacheTag('tasks');
  const { items } = await listTasks();
  return items.length;
}

/** 問題8: タスクの数。2秒より古ければ作り直す。とても短いので、前もって作る HTML には入らない */
export async function getFreshCount(): Promise<number> {
  'use cache';
  cacheLife({ revalidate: 2, expire: 60 });
  const { items } = await listTasks();
  return items.length;
}
