// 5.1節: 送るメールの中身を作る関数。テキストと HTML の両方を作る
import type { Mail } from './mailer.ts';

/** HTML に入れる文字を、ただの文字にする（第4部 第21章） */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** 登録の確認のメール */
export function buildVerifyMail(to: string, link: string): Mail {
  return {
    to,
    subject: 'メールアドレスの確認',
    text: [
      'タスク管理への登録を受け付けました。',
      '次のリンクを開いて、メールアドレスを確認してください（24時間有効）。',
      '',
      link,
      '',
      'このメールに心当たりが無ければ、何もしなくてかまいません。',
    ].join('\n'),
    html: [
      '<p>タスク管理への登録を受け付けました。</p>',
      '<p>次のリンクを開いて、メールアドレスを確認してください（24時間有効）。</p>',
      `<p><a href="${escapeHtml(link)}">メールアドレスを確認する</a></p>`,
      '<p>このメールに心当たりが無ければ、何もしなくてかまいません。</p>',
    ].join('\n'),
  };
}

/** 登録済みのアドレスで、もう一度登録しようとしたときのメール（5.3節） */
export function buildAlreadyRegisteredMail(to: string, loginUrl: string): Mail {
  return {
    to,
    subject: '登録済みのメールアドレスです',
    text: [
      'このメールアドレスは、すでに登録されています。',
      `ログインはこちら: ${loginUrl}`,
      'パスワードを忘れたときは、ログインの画面から再設定できます。',
      '',
      'このメールに心当たりが無ければ、何もしなくてかまいません。',
    ].join('\n'),
  };
}
