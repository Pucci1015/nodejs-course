// 追加（第10部）: 登録（/register）。登録済みのアドレスでも、同じ「メールを送りました」を出す（API と同じ。第53章 5.3節）
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { register } from '../api/auth.ts';
import { ApiError, toFieldErrors } from '../api/client.ts';
import { Field } from '../components/Field.tsx';
import { PageTitle } from '../components/PageTitle.tsx';
import { errorMessage } from '../lib/errors.ts';

type Errors = Partial<Record<'email' | 'password' | 'form', string>>;

export function RegisterPage(): ReactNode {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // 画面では「空でないか」だけ。パスワードの決まり（長さ・よく使われるもの）は、API が確かめて 422 で教える
    const next: Errors = {};
    if (values.email.trim() === '') next.email = 'メールアドレスを入れてください';
    if (values.password === '') next.password = 'パスワードを入れてください';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPending(true);
    try {
      await register(values);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const fields = toFieldErrors(err.problem);
        setErrors({
          email: fields.email,
          password: fields.password,
          form: fields.email || fields.password ? undefined : err.message,
        });
      } else {
        setErrors({ form: errorMessage(err) });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageTitle>登録</PageTitle>
      {sent ? (
        <p role="status">
          {values.email}{' '}
          にメールを送りました。届いたメールのリンクを開いてください（届かないときは、迷惑メールのフォルダも見てください）。
        </p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <Field
            label="メールアドレス"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(email) => setValues({ ...values, email })}
            error={errors.email}
          />
          <Field
            label="パスワード"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="12 文字以上。よく使われるものや、メールアドレスを含むものは使えません"
            value={values.password}
            onChange={(password) => setValues({ ...values, password })}
            error={errors.password}
          />
          {errors.form !== undefined && (
            <p role="alert" className="error">
              {errors.form}
            </p>
          )}
          <button type="submit" disabled={pending}>
            {pending ? '送っています…' : '登録する'}
          </button>
        </form>
      )}
      <p>
        <Link to="/login">ログインのページへ</Link>
      </p>
    </>
  );
}
