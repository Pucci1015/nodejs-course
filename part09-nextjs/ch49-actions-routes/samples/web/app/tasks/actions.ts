'use server';
// 第49章 3節: Server Action。ブラウザのフォームやボタンから、サーバのこの関数が呼ばれる
// 'use server' のファイルからは、async の関数だけを export できる（型は export してよい）
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError, createTask, deleteTask, isStatus, toFieldErrors, updateTask } from '../../lib/api.ts';

/** フォームの結果。エラーの文と、打った値（エラーのとき、入れ直さなくてよいように返す） */
export type FormState = {
  errors: { title?: string; dueDate?: string; form?: string };
  values: { title: string; dueDate: string };
};

// FormData の値は、文字か File。文字でなければ空とみなす
const text = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');

const NewTaskSchema = z.object({
  title: z.string().trim().min(1, '題名を入れてください').max(100, '題名は 100 文字までです'),
  dueDate: z.union([z.literal(''), z.iso.date('締め切りは YYYY-MM-DD の形で入れてください')]),
});

/** 3.2節: タスクを作る。useActionState から呼ぶので、1つ目の引数は前の結果 */
export async function createTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { title: text(formData.get('title')), dueDate: text(formData.get('dueDate')) };
  // ブラウザで確かめていても、サーバでもう一度確かめる（4節。この関数には、誰でも POST できる）
  const parsed = NewTaskSchema.safeParse(values);
  if (!parsed.success) {
    const errors: FormState['errors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'title' || key === 'dueDate') errors[key] ??= issue.message;
    }
    return { errors, values };
  }

  let id: number;
  try {
    const task = await createTask({ title: parsed.data.title, dueDate: parsed.data.dueDate === '' ? null : parsed.data.dueDate });
    id = task.id;
  } catch (err) {
    // API が断った理由（締め切りが過ぎている、同じ題名がある など）を、フォームに出す
    if (err instanceof ApiError && err.status < 500) {
      const fields = toFieldErrors(err.problem);
      if (fields.title === undefined && fields.dueDate === undefined) return { errors: { form: err.message }, values };
      return { errors: { title: fields.title, dueDate: fields.dueDate }, values };
    }
    throw err; // それ以外は error.tsx に任せる
  }
  // redirect は、特別なエラーを投げてここで止める。try の中で呼ぶと catch に捕まるので、外で呼ぶ
  redirect(`/tasks/${id}`);
}

/** 3.4節: 状態を変える。ボタンから、id・version・新しい状態を受け取る */
export async function setStatusAction(id: number, version: number, status: string): Promise<{ error: string | null }> {
  // 引数も、ブラウザから送られてくる値。型が付いていても、確かめる（4節）
  if (!Number.isInteger(id) || !Number.isInteger(version) || !isStatus(status)) return { error: '送られた値が正しくありません' };
  try {
    await updateTask({ id, version }, { status });
  } catch (err) {
    if (err instanceof ApiError && [404, 409, 412].includes(err.status)) {
      refresh(); // 最新の内容で、ページを作り直してもらう
      return { error: err.message };
    }
    throw err;
  }
  refresh();
  return { error: null };
}

/** 3.3節: 消す。bind で id と version を決めてから、フォームの action に渡す */
export async function deleteTaskAction(id: number, version: number): Promise<void> {
  if (!Number.isInteger(id) || !Number.isInteger(version)) return;
  try {
    await deleteTask({ id, version });
  } catch (err) {
    // ほかの人が先に変えていたら、消さずに、そのタスクのページに戻して知らせる
    if (err instanceof ApiError && err.status === 412) redirect(`/tasks/${id}?conflict=1`);
    if (!(err instanceof ApiError && err.status === 404)) throw err; // 404 は、もう消えている
  }
  redirect('/tasks');
}
