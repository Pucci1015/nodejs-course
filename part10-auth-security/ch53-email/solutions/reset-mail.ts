// 第53章 練習問題1 の模範解答: パスワードの再設定のメールを作る（本文5.1節の buildVerifyMail を変える）
import type { Mail } from '../exercises/mailer.ts';
import { escapeHtml } from '../exercises/mails.ts';

export function buildResetMail(to: string, link: string, minutes: number): Mail {
  // メールのリンクは、http か https だけ（javascript: などを入れない。第4部 第21章の safeUrl と同じ考え方）
  const protocol = new URL(link).protocol;
  if (protocol !== 'https:' && protocol !== 'http:') throw new Error('リンクは http か https にしてください');
  return {
    to,
    subject: 'パスワードの再設定',
    text: [
      'パスワードの再設定を受け付けました。',
      `次のリンクを開いて、新しいパスワードを決めてください（${minutes}分有効、1回だけ使えます）。`,
      '',
      link,
      '',
      'このメールに心当たりが無ければ、何もしなくてかまいません。パスワードは変わりません。',
    ].join('\n'),
    html: [
      '<p>パスワードの再設定を受け付けました。</p>',
      `<p>次のリンクを開いて、新しいパスワードを決めてください（${minutes}分有効、1回だけ使えます）。</p>`,
      `<p><a href="${escapeHtml(link)}">新しいパスワードを決める</a></p>`,
      '<p>このメールに心当たりが無ければ、何もしなくてかまいません。パスワードは変わりません。</p>',
    ].join('\n'),
  };
}
