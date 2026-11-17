// 追加（第10部）: 新しいパスワードにする（/reset-password#token=…）。変えると、ほかの端末のログインも終わる（API がセッションを消す）
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { resetPassword } from '../api/auth.ts';
import { ApiError, toFieldErrors } from '../api/client.ts';
import { Field } from '../components/Field.tsx';
import { PageTitle } from '../components/PageTitle.tsx';
import { errorMessage } from '../lib/errors.ts';
import { tokenFromHash } from '../lib/token-from-hash.ts';

export function ResetPasswordPage(): ReactNode {
  const token = tokenFromHash(useLocation().hash);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string | undefined; form?: string | undefined }>({});
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (token === null) return;
    if (password === '') return setErrors({ password: 'パスワードを入れてください' });
    setErrors({});
    setPending(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setErrors({ password: toFieldErrors(err.problem).password ?? err.message });
      else setErrors({ form: errorMessage(err) });
    } finally {
      setPending(false);
    }
  }

  let body: ReactNode;
  if (token === null) body = <p role="alert">リンクが正しくありません。メールのリンクを、そのまま開いてください。</p>;
  else if (done)
    body = (
      <p role="status">
        パスワードを変えました。<Link to="/login">新しいパスワードでログイン</Link>してください。
      </p>
    );
  else
    body = (
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <Field
          label="新しいパスワード"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="12 文字以上。よく使われるものや、メールアドレスを含むものは使えません"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        {errors.form !== undefined && (
          <p role="alert" className="error">
            {errors.form} <Link to="/forgot-password">メールを送り直す</Link>
          </p>
        )}
        <button type="submit" disabled={pending}>
          パスワードを変える
        </button>
      </form>
    );

  return (
    <>
      <PageTitle>新しいパスワード</PageTitle>
      {body}
    </>
  );
}
