// 第53章 練習問題1: パスワードの再設定のメールを作る（本文5.1節の buildVerifyMail を変える）
import type { Mail } from './mailer.ts';
import { escapeHtml } from './mails.ts';

export function buildResetMail(to: string, link: string, minutes: number): Mail {
  // ここを書く
  void escapeHtml;
  throw new Error(`まだ書いていません: ${to} ${link} ${minutes}`);
}
