// 送るメールの中身。第53章 5.1節の mails.ts と、練習問題1の再設定のメールのコピー
import type { Mail } from './mailer.ts';

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** リンクは http か https だけ（第4部 第21章の safeUrl と同じ考え方） */
function checkLink(link: string): void {
  const protocol = new URL(link).protocol;
  if (protocol !== 'https:' && protocol !== 'http:') throw new Error('リンクは http か https にしてください');
}

export function buildVerifyMail(to: string, link: string, hours: number): Mail {
  checkLink(link);
  return {
    to,
    subject: 'メールアドレスの確認',
    text: [
      '会議室の予約に登録しました。次のリンクを開いて、メールアドレスを確認してください。',
      '',
      link,
      '',
      `リンクは ${hours} 時間だけ使えます。`,
      '心当たりが無ければ、このメールは捨ててください。',
    ].join('\n'),
    html: [
      '<p>会議室の予約に登録しました。次のリンクを開いて、メールアドレスを確認してください。</p>',
      `<p><a href="${escapeHtml(link)}">メールアドレスを確認する</a></p>`,
      `<p>リンクは ${hours} 時間だけ使えます。心当たりが無ければ、このメールは捨ててください。</p>`,
    ].join('\n'),
  };
}

/** 登録済みのアドレスで、もう一度登録しようとしたとき（第53章 5.3節。本人にだけ伝える） */
export function buildAlreadyRegisteredMail(to: string, loginLink: string, resetLink: string): Mail {
  checkLink(loginLink);
  checkLink(resetLink);
  return {
    to,
    subject: 'すでに登録されています',
    text: [
      'このメールアドレスは、すでに登録されています。',
      '',
      `ログイン: ${loginLink}`,
      `パスワードを忘れたとき: ${resetLink}`,
      '',
      '心当たりが無ければ、このメールは捨ててください。',
    ].join('\n'),
    html: [
      '<p>このメールアドレスは、すでに登録されています。</p>',
      `<p><a href="${escapeHtml(loginLink)}">ログイン</a> ／ <a href="${escapeHtml(resetLink)}">パスワードを忘れたとき</a></p>`,
      '<p>心当たりが無ければ、このメールは捨ててください。</p>',
    ].join('\n'),
  };
}

export function buildResetMail(to: string, link: string, minutes: number): Mail {
  checkLink(link);
  return {
    to,
    subject: 'パスワードの再設定',
    text: [
      'パスワードの再設定を受け付けました。次のリンクを開いて、新しいパスワードを決めてください。',
      '',
      link,
      '',
      `リンクは ${minutes}分だけ使えます。`,
      '心当たりが無ければ、このメールは捨ててください。パスワードは変わりません。',
    ].join('\n'),
    html: [
      '<p>パスワードの再設定を受け付けました。次のリンクを開いて、新しいパスワードを決めてください。</p>',
      `<p><a href="${escapeHtml(link)}">新しいパスワードを決める</a></p>`,
      `<p>リンクは ${minutes}分だけ使えます。心当たりが無ければ、このメールは捨ててください。パスワードは変わりません。</p>`,
    ].join('\n'),
  };
}
