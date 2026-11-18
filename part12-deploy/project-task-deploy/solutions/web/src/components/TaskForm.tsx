// 作る・直すの両方で使うフォーム（第43章 5節、第45章 6節）
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, toFieldErrors } from '../api/client.ts';
import { TaskInputSchema, type TaskFormValues, type TaskInput } from '../api/schemas.ts';

type Props = {
  initial?: TaskFormValues;
  submitLabel: string;
  /** 送る。失敗したら投げる（ApiError なら、項目ごとの間違いを出す） */
  onSubmit: (input: TaskInput) => Promise<unknown>;
};

type Errors = Partial<Record<'title' | 'dueDate' | 'form', string>>;

export function TaskForm({ initial = { title: '', dueDate: '' }, submitLabel, onSubmit }: Props): ReactNode {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const id = useId();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // 1. 送る前に、画面で確かめる（API と同じ決まり）
    const parsed = TaskInputSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === 'title' || key === 'dueDate') && next[key] === undefined) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    // 2. 送る。サーバが断ったら、その理由を出す
    setErrors({});
    setPending(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const fields = toFieldErrors(err.problem);
        setErrors({
          title: fields.title,
          dueDate: fields.dueDate,
          form: fields.title || fields.dueDate ? undefined : err.message,
        });
      } else {
        setErrors({ form: err instanceof Error ? err.message : '送れませんでした' });
      }
    } finally {
      setPending(false);
    }
  }

  const field = (name: 'title' | 'dueDate', label: string, type: string) => (
    <p>
      <label htmlFor={`${id}-${name}`}>{label}</label>
      <br />
      <input
        id={`${id}-${name}`}
        name={name}
        type={type}
        value={values[name]}
        onChange={(e) => setValues({ ...values, [name]: e.target.value })}
        aria-invalid={errors[name] !== undefined}
        aria-describedby={errors[name] !== undefined ? `${id}-${name}-error` : undefined}
      />
      {errors[name] !== undefined && (
        <span id={`${id}-${name}-error`} className="error">
          {errors[name]}
        </span>
      )}
    </p>
  );

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      {field('title', '題名', 'text')}
      {field('dueDate', '締め切り', 'date')}
      {errors.form !== undefined && (
        <p role="alert" className="error">
          {errors.form}
        </p>
      )}
      <button type="submit" disabled={pending}>
        {pending ? '送っています…' : submitLabel}
      </button>
    </form>
  );
}
