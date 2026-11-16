// 第43章 練習問題7の模範解答
import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../exercises/api.ts';
import { TaskInputSchema, type TaskFormValues, type TaskInput } from '../exercises/schemas.ts';

type Props = { onSubmit: (input: TaskInput) => Promise<unknown>; submitLabel?: string };
const empty: TaskFormValues = { title: '', dueDate: '' };

export function TaskForm({ onSubmit, submitLabel = '追加' }: Props): ReactNode {
  const [values, setValues] = useState<TaskFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = TaskInputSchema.safeParse(values);
    if (!r.success) {
      const fe: Record<string, string> = {};
      for (const issue of r.error.issues) fe[String(issue.path[0])] ??= issue.message;
      setErrors(fe);
      return;
    }
    setErrors({});
    setSending(true);
    try {
      await onSubmit(r.data);
      setValues(empty);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && error.problem.errors) {
        const fe: Record<string, string> = {};
        for (const x of error.problem.errors) fe[x.pointer?.replace(/^#\//, '') ?? ''] ??= x.detail;
        setErrors(fe);
      } else {
        setErrors({ '': error instanceof Error ? error.message : '送れませんでした' });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      <label>
        題名 <input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} aria-invalid={errors.title !== undefined} />
      </label>
      {errors.title && <p role="alert">{errors.title}</p>}
      <label>
        締め切り <input type="date" value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} aria-invalid={errors.dueDate !== undefined} />
      </label>
      {errors.dueDate && <p role="alert">{errors.dueDate}</p>}
      {errors[''] && <p role="alert">{errors['']}</p>}
      <button disabled={sending}>{sending ? '送信中…' : submitLabel}</button>
    </form>
  );
}
