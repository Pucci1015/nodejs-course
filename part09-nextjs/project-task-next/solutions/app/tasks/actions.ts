'use server';
// Server Action（第49章 3節）。画面からの書き換えは、すべてここを通る。引数は、どれもブラウザから届く値として確かめる（第49章 4節）
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, createTask, deleteTask, toFieldErrors, updateTask } from '../../lib/api.ts';
import { STATUSES, TaskInputSchema, type Status, type TaskPatch } from '../../lib/schemas.ts';

/** 作る・直すフォームの結果 */
export type FormState = {
  errors: { title?: string; dueDate?: string; form?: string };
  values: { title: string; dueDate: string };
  /** 412（ほかの人が先に変えた）なら true。フォームに「読み直す」を出す */
  stale?: boolean;
};
/** ボタンやチェックボックスからの書き換えの結果 */
export type ActionResult = { error: string | null };

const text = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');
const isId = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
const isStatus = (v: unknown): v is Status => typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
const BAD_INPUT = '送られた値が正しくありません';

/** 412 のときの文（第8部の errors.ts と同じ） */
const messageOf = (err: ApiError) => (err.status === 412 ? 'ほかの人が先に変えました。読み直してから、もう一度やってください' : err.message);

/** フォームの値を確かめる。駄目なら FormState のエラー */
function validate(formData: FormData) {
  const values = { title: text(formData.get('title')), dueDate: text(formData.get('dueDate')) };
  const parsed = TaskInputSchema.safeParse(values);
  if (parsed.success) return { values, input: parsed.data, errors: null };
  const errors: FormState['errors'] = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (key === 'title' || key === 'dueDate') errors[key] ??= issue.message;
  }
  return { values, input: null, errors };
}

/** API が断ったとき（422・409 など）を、フォームのエラーにする */
function apiErrors(err: ApiError): FormState['errors'] {
  const fields = toFieldErrors(err.problem);
  if (fields.title !== undefined || fields.dueDate !== undefined) return { title: fields.title, dueDate: fields.dueDate };
  return { form: messageOf(err) };
}

/** 2.3節: 作る。作れたら、そのタスクのページに移る（?created=1 で「作りました」を出す） */
export async function createTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { values, input, errors } = validate(formData);
  if (input === null) return { errors, values };
  let id: number;
  try {
    id = (await createTask(input)).id;
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { errors: apiErrors(err), values };
    throw err;
  }
  redirect(`/tasks/${id}?created=1`);
}

/** 2.4節: 直す。変わった項目だけを送る（original は、フォームを出したときの値） */
export async function updateTaskAction(
  id: number,
  version: number,
  original: { title: string; dueDate: string | null },
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { values, input, errors } = validate(formData);
  if (!isId(id) || !isId(version)) return { errors: { form: BAD_INPUT }, values };
  if (input === null) return { errors, values };
  const patch: TaskPatch = {};
  if (input.title !== original.title) patch.title = input.title;
  if (input.dueDate !== original.dueDate) patch.dueDate = input.dueDate;
  if (Object.keys(patch).length === 0) return { errors: {}, values };
  try {
    await updateTask({ id, version }, patch);
  } catch (err) {
    // 412 では refresh() を呼ばない。打った値を残したまま知らせ、「読み直す」は利用者が選ぶ
    if (err instanceof ApiError && err.status === 412) return { errors: { form: messageOf(err) }, values, stale: true };
    if (err instanceof ApiError && err.status < 500) return { errors: apiErrors(err), values };
    throw err;
  }
  refresh();
  return { errors: {}, values: { title: input.title, dueDate: input.dueDate ?? '' } };
}

/** 2.2・2.4節: 状態を変える（一覧の「完了」のチェックと、タスクのページの「状態」） */
export async function setStatusAction(id: number, version: number, status: string): Promise<ActionResult> {
  if (!isId(id) || !isId(version) || !isStatus(status)) return { error: BAD_INPUT };
  try {
    await updateTask({ id, version }, { status });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) {
      refresh(); // 画面が古いかもしれないので、最新にしてもらう
      return { error: messageOf(err) };
    }
    throw err;
  }
  refresh();
  return { error: null };
}

/** 2.4節: 消す。消せたら一覧に戻り、?deleted=題名 で「消しました」を出す */
export async function deleteTaskAction(id: number, version: number, title: string): Promise<ActionResult> {
  if (!isId(id) || !isId(version)) return { error: BAD_INPUT };
  try {
    await deleteTask({ id, version });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) {
      refresh();
      return { error: messageOf(err) };
    }
    throw err;
  }
  redirect(`/?${new URLSearchParams({ deleted: title.slice(0, 100) })}`);
}
