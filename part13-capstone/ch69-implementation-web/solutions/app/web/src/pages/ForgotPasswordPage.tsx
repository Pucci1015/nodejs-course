// パスワードを忘れたとき（/forgot-password）。登録されていないアドレスでも、同じ答えを出す（第53章 6節）
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { forgotPassword } from '../api/auth.ts';
import { Field } from '../components/Field.tsx';
import { PageTitle } from '../components/PageTitle.tsx';
import { errorMessage } from '../lib/errors.ts';

export function ForgotPasswordPage(): ReactNode {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const send = useMutation({ mutationFn: forgotPassword });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (email.trim() === '') return setError('メールアドレスを入れてください');
    setError(undefined);
    send.mutate(email);
  }

  return (
    <>
      <PageTitle>パスワードの再設定</PageTitle>
      {send.isSuccess ? (
        <p role="status">{email} が登録されていれば、再設定のメールを送りました。リンクは 30 分だけ使えます。</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="メールアドレス"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            error={error}
          />
          {send.isError && (
            <p role="alert" className="error">
              {errorMessage(send.error)}
            </p>
          )}
          <button type="submit" disabled={send.isPending}>
            再設定のメールを送る
          </button>
        </form>
      )}
      <p>
        <Link to="/login">ログインのページへ</Link>
      </p>
    </>
  );
}
