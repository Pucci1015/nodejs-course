// 第50章 練習問題5・8: タスクの数を読む関数（ここに書きます）
import { listTasks } from './api.ts';

/** 問題5: タスクの数。'use cache' で覚えておく */
export async function getTaskCount(): Promise<number> {
  void listTasks; // （この行は消してかまいません）
  throw new Error('まだ書いていません');
}

/** 問題8: タスクの数。2秒ごとに新しくする */
export async function getFreshCount(): Promise<number> {
  throw new Error('まだ書いていません');
}
