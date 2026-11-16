'use client';
// 第49章 3.2節: タスクを作るフォーム。Server Action を props で受け取り、useActionState で結果（エラー）を持つ
import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '../app/tasks/actions.ts';

const initialState: FormState = { errors: {}, values: { title: '', dueDate: '' } };

/** 送っている間は押せないボタン。useFormStatus は、<form> の中の部品で使う */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? '作っています…' : '作る'}
    </button>
  );
}

export function TaskForm({ action }: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, initialState);
  const id = useId();
  const { errors, values } = state;
  return (
    // key: 結果が変わるたびに、入力欄を、返ってきた値で作り直す（React 19 は、送った後にフォームを空にするので）
    <form action={formAction} key={JSON.stringify(values)} noValidate>
      {errors.form && <p role="alert">{errors.form}</p>}
      <p>
        <label htmlFor={`${id}-title`}>題名</label>
        <br />
        <input
          id={`${id}-title`}
          name="title"
          defaultValue={values.title}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
        />
        {errors.title && <span id={`${id}-title-error`}> {errors.title}</span>}
      </p>
      <p>
        <label htmlFor={`${id}-due`}>締め切り</label>
        <br />
        <input
          id={`${id}-due`}
          name="dueDate"
          type="date"
          defaultValue={values.dueDate}
          aria-invalid={errors.dueDate ? true : undefined}
          aria-describedby={errors.dueDate ? `${id}-due-error` : undefined}
        />
        {errors.dueDate && <span id={`${id}-due-error`}> {errors.dueDate}</span>}
      </p>
      <SubmitButton />
    </form>
  );
}
