// 予約のメールの中身（第69章 4節）。純粋な関数（宛先と予約を受け取って、Mail を返すだけ）
// 本文には、予約した人のほかの情報（ほかの人の名前など）を入れない
import type { Mail } from '../auth/mailer.ts';
import { hhmm, tokyoParts } from '../domain/time.ts';

export type MailBooking = { roomName: string; title: string; startsAt: Date; endsAt: Date };

/** '12/10 10:00〜11:00 会議室A「定例」' */
export function describe(b: MailBooking): string {
  const s = tokyoParts(b.startsAt);
  const e = tokyoParts(b.endsAt);
  const [, m, d] = s.date.split('-');
  return `${Number(m)}/${Number(d)} ${hhmm(s.minutes)}〜${hhmm(e.minutes)} ${b.roomName}「${b.title}」`;
}

/** 管理者が予約を取り消したとき、予約した人へ */
export function canceledByAdminMail(to: string, b: MailBooking, appUrl: string): Mail {
  return {
    to,
    subject: '予約が取り消されました',
    text: [
      '次の予約は、管理者が取り消しました。',
      '',
      describe(b),
      '',
      `ほかの時間を予約するときは、こちらから: ${appUrl}/`,
    ].join('\n'),
  };
}

/** 前日のリマインド。その人の、その日の予約を全部（早い順） */
export function reminderMail(to: string, day: string, bookings: MailBooking[], appUrl: string): Mail {
  const [, m, d] = day.split('-');
  return {
    to,
    subject: `明日（${Number(m)}/${Number(d)}）の会議室の予約`,
    text: [
      '明日の会議室の予約です。',
      '',
      ...bookings.map((b) => `- ${describe(b)}`),
      '',
      `使わなくなったら、取り消してください: ${appUrl}/mine`,
    ].join('\n'),
  };
}
