// メールアドレスの確認（/verify-email#token=…）
// リンクを開いただけでは使わず、ボタンを押したときに POST する。メールのセキュリティの仕組みが、先にリンクを開くことがあるため
// （開いただけで使うと、本人が開く前にトークンが使われてしまう）。StrictMode で2回送ってしまうことも防げる
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { verifyEmail } from '../api/auth.ts';
import { PageTitle } from '../components/PageTitle.tsx';
import { errorMessage } from '../lib/errors.ts';
import { tokenFromHash } from '../lib/token-from-hash.ts';

export function VerifyEmailPage(): ReactNode {
  const token = tokenFromHash(useLocation().hash);
  const verify = useMutation({ mutationFn: verifyEmail });

  let body: ReactNode;
  if (token === null) body = <p role="alert">リンクが正しくありません。メールのリンクを、そのまま開いてください。</p>;
  else if (verify.isSuccess)
    body = (
      <p role="status">
        確認できました。<Link to="/login">ログイン</Link>してください。
      </p>
    );
  else
    body = (
      <>
        <button type="button" disabled={verify.isPending} onClick={() => verify.mutate(token)}>
          メールアドレスを確かめる
        </button>
        {verify.isError && (
          <p role="alert" className="error">
            {errorMessage(verify.error)}
          </p>
        )}
      </>
    );

  return (
    <>
      <PageTitle>メールアドレスの確認</PageTitle>
      {body}
    </>
  );
}
