'use client';
// 作る・直すフォーム（第49章 3.2節）。確かめるのはサーバ（Server Action）。結果は useActionState で受け取る
import { useRouter } from 'next/navigation';
import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '../app/tasks/actions.ts';

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: FormState['values'];
  submitLabel: string;
  pendingLabel: string;
};

export function TaskForm({ action, initial, submitLabel, pendingLabel }: Props) {
  const [state, formAction] = useActionState(action, { errors: {}, values: initial });
  const id = useId();
  const router = useRouter();
  const { errors, values } = state;
  const field = (name: 'title' | 'dueDate') => ({
    id: `${id}-${name}`,
    name,
    defaultValue: values[name],
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
  });
  return (
    // 送った後に React が入力欄を空にするので、返ってきた値で作り直す（第49章 3.2節）
    <form action={formAction} key={JSON.stringify(values)} noValidate>
      {errors.form && (
        <p role="alert" className="error">
          {errors.form}
        </p>
      )}
      {/* 412: ページを作り直してもらうと、新しい version と中身のフォームに替わる */}
      {state.stale && (
        <p>
          <button type="button" onClick={() => router.refresh()}>
            読み直す
          </button>
        </p>
      )}
      <p>
        <label htmlFor={`${id}-title`}>題名</label>
        <br />
        <input {...field('title')} />
        {errors.title && (
          <span id={`${id}-title-error`} className="error">
            {' '}
            {errors.title}
          </span>
        )}
      </p>
      <p>
        <label htmlFor={`${id}-dueDate`}>締め切り</label>
        <br />
        <input type="date" {...field('dueDate')} />
        {errors.dueDate && (
          <span id={`${id}-dueDate-error`} className="error">
            {' '}
            {errors.dueDate}
          </span>
        )}
      </p>
      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
