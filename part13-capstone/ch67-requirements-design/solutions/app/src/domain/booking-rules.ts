// 予約の決まり（第67章 6.2節。3節の要件を、コードにしたもの）
// 「今」は引数で受け取る（テストで時刻を決められるように。第56章 3節）
import { addDays, hhmm, tokyoParts } from './time.ts';

export const RULES = {
  slotMinutes: 30, // 予約は 30 分の区切り
  openMinutes: 8 * 60, // 8:00 から
  closeMinutes: 21 * 60, // 21:00 まで
  minMinutes: 30, // 短くて 30 分
  maxMinutes: 3 * 60, // 長くて 3 時間
  maxDaysAhead: 60, // 60 日先まで
  maxUpcomingPerUser: 10, // 1人の「これからの予約」は 10 件まで
  titleMax: 100,
} as const;

/** 決まりに合わないところ。field は API の入力の名前（422 の pointer にする） */
export type BookingIssue = { field: 'startsAt' | 'endsAt'; message: string };

const onGrid = (d: Date) => d.getTime() % (RULES.slotMinutes * 60_000) === 0;

/**
 * 予約の時刻が決まりに合うかを確かめ、合わないところを全部返す（合えば空の配列）
 * 日本は UTC との差が 9 時間ちょうどなので、UTC で 30 分の区切りなら、日本でも 30 分の区切り
 */
export function checkBookingTime(startsAt: Date, endsAt: Date, now: Date): BookingIssue[] {
  const issues: BookingIssue[] = [];
  if (!onGrid(startsAt))
    issues.push({ field: 'startsAt', message: '始まりは 30 分の区切り（:00 か :30）にしてください' });
  if (!onGrid(endsAt)) issues.push({ field: 'endsAt', message: '終わりは 30 分の区切り（:00 か :30）にしてください' });
  if (issues.length > 0) return issues; // 区切りが合わなければ、ほかは数えない

  const minutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
  if (minutes <= 0) return [{ field: 'endsAt', message: '終わりは、始まりより後にしてください' }];
  if (minutes < RULES.minMinutes || minutes > RULES.maxMinutes)
    issues.push({ field: 'endsAt', message: '長さは 30 分から 3 時間までです' });

  const start = tokyoParts(startsAt);
  const end = tokyoParts(endsAt);
  // 21:00 ちょうどに終わるのはよい。日をまたぐ（終わりが次の日）のはだめ
  const endMinutes = end.date === start.date ? end.minutes : end.minutes + 24 * 60;
  if (start.minutes < RULES.openMinutes || endMinutes > RULES.closeMinutes)
    issues.push({
      field: 'startsAt',
      message: `予約できるのは ${hhmm(RULES.openMinutes)}〜${hhmm(RULES.closeMinutes)} です`,
    });

  if (startsAt.getTime() <= now.getTime()) issues.push({ field: 'startsAt', message: '過ぎた時刻は予約できません' });
  else if (start.date > addDays(tokyoParts(now).date, RULES.maxDaysAhead))
    issues.push({ field: 'startsAt', message: `予約できるのは ${RULES.maxDaysAhead} 日先までです` });
  return issues;
}

export type Role = 'member' | 'admin';

/** 取り消せるか。理由で分けて返す（ルートが 403・409 に読み替える） */
export function canCancel(
  booking: { userId: number; startsAt: Date; canceledAt: Date | null },
  actor: { id: number; role: Role },
  now: Date,
): 'ok' | 'forbidden' | 'started' | 'canceled' {
  if (booking.userId !== actor.id && actor.role !== 'admin') return 'forbidden';
  if (booking.canceledAt !== null) return 'canceled';
  if (booking.startsAt.getTime() <= now.getTime()) return 'started';
  return 'ok';
}
