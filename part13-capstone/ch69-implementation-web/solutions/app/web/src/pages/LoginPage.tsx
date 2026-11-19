// ログイン（/login）。ログインできたら ?next= のページ（無ければ最初のページ）へ
import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { isUnverified, login, resendVerification } from '../api/auth.ts';
import { ApiError } from '../api/client.ts';
import { meKey } from '../api/queries.ts';
import { useAnnounce } from '../components/Announcer.tsx';
import { Field } from '../components/Field.tsx';
import { PageTitle } from '../components/PageTitle.tsx';
import { errorMessage } from '../lib/errors.ts';
import { safeNext } from '../lib/safe-next.ts';

/** 練習用の IdP から戻ってきたときの ?error=（API の /api/auth/idp/callback が付ける） */
const IDP_ERRORS: Record<string, string> = {
  state: 'ログインをやり直してください（時間が経ったか、別のタブで始めたログインです）',
  denied: 'IdP でのログインが取り消されました',
  idp: 'IdP でのログインに失敗しました',
  conflict: '同じメールアドレスのアカウントがあります。パスワードでログインしてください',
};

export function LoginPage(): ReactNode {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const idpError = IDP_ERRORS[params.get('error') ?? ''];
  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | undefined>(idpError);
  const [unverified, setUnverified] = useState(false);
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const announce = useAnnounce();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (values.email.trim() === '' || values.password === '') {
      setError('メールアドレスとパスワードを入れてください');
      return;
    }
    setError(undefined);
    setUnverified(false);
    setPending(true);
    try {
      await login(values);
      // 「ログインしている人」を読み直す。読み終わってから移る（移った先のページが、まだ「ログインしていない」と思わないように）
      await queryClient.invalidateQueries({ queryKey: meKey });
      announce('ログインしました');
      await navigate(next, { replace: true });
    } catch (err) {
      if (isUnverified(err)) setUnverified(true);
      else if (err instanceof ApiError && err.status === 401) setError('メールアドレスかパスワードが違います');
      else setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    try {
      await resendVerification(values);
      setUnverified(false);
      announce('確認のメールを送り直しました');
      setError(undefined);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageTitle>ログイン</PageTitle>
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <Field
          label="メールアドレス"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(email) => setValues({ ...values, email })}
        />
        <Field
          label="パスワード"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(password) => setValues({ ...values, password })}
        />
        {error !== undefined && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {unverified && (
          <div role="alert">
            <p>メールアドレスの確認がまだです。届いたメールのリンクを開いてください。</p>
            <button type="button" onClick={() => void resend()}>
              確認のメールを送り直す
            </button>
          </div>
        )}
        <button type="submit" disabled={pending}>
          {pending ? '送っています…' : 'ログイン'}
        </button>
      </form>
      <p>
        <Link to="/forgot-password">パスワードを忘れたとき</Link>・<Link to="/register">登録する</Link>
      </p>
      {/* 練習用の IdP（第54章）。API に OIDC_ の設定があるときだけ、VITE_IDP_LOGIN=1 で出す。ページごと移るので、Link ではなく a */}
      {import.meta.env.VITE_IDP_LOGIN === '1' && (
        <p>
          <a href="/api/auth/idp/login">練習用の IdP でログイン</a>
        </p>
      )}
    </>
  );
}
