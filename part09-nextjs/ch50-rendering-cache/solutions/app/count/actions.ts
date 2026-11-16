'use server';
// 第50章 練習問題7の模範解答: タスクを足して、名札 'tasks' の覚えておいた数を、すぐに捨てる
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, createTask } from '../../lib/api.ts';

export async function addTaskAction(_prev: string | null, formData: FormData): Promise<string | null> {
  const value = formData.get('title');
  const title = typeof value === 'string' ? value.trim() : '';
  if (title === '') return '題名を入れてください';
  if (title.length > 100) return '題名は 100 文字までです';
  try {
    await createTask({ title, dueDate: null });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return err.message;
    throw err;
  }
  updateTag('tasks'); // redirect は投げて止めるので、その前に呼ぶ
  redirect('/count');
}
