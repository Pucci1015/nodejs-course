// 第43章 5節: 送る前にスキーマで確かめ、API の間違い（422・409）も項目ごとに出すフォーム
import { useState, type FormEvent } from 'react';
import { ApiError } from './api.ts';
import { toFieldErrors } from './fieldErrors.ts';
import { useCreateTask } from './queries.ts';
import { TaskInputSchema, type TaskFormValues } from './schemas.ts';

const empty: TaskFormValues = { title: '', dueDate: '' };

export function NewTaskForm() {
  const [values, setValues] = useState<TaskFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateTask();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // 5.2節: 送る前に、同じ決まりで確かめる（画面ですぐ知らせるため。API も必ず確かめる）
    const r = TaskInputSchema.safeParse(values);
    if (!r.success) {
      const fe: Record<string, string> = {};
      for (const issue of r.error.issues) fe[String(issue.path[0])] ??= issue.message;
      setErrors(fe);
      return;
    }
    setErrors({});
    create.mutate(r.data, {
      onSuccess: () => setValues(empty),
      onError: (error) => {
        // 5.3節: 422 は項目ごと、それ以外（409 など）はフォーム全体の間違い
        if (error instanceof ApiError && error.status === 422) setErrors(toFieldErrors(error.problem));
        else setErrors({ '': error.message });
      },
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2>タスクを足す</h2>
      <label>
        題名 <input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} aria-invalid={errors.title !== undefined} />
      </label>
      {errors.title && <p role="alert">{errors.title}</p>}
      <label>
        締め切り <input type="date" value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} aria-invalid={errors.dueDate !== undefined} />
      </label>
      {errors.dueDate && <p role="alert">{errors.dueDate}</p>}
      {errors[''] && <p role="alert">{errors['']}</p>}
      <button disabled={create.isPending}>{create.isPending ? '送信中…' : '追加'}</button>
    </form>
  );
}
