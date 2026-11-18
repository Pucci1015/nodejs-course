// 予約のメールの中身（src/services/booking-mails.ts）と、リマインドの日（src/jobs/reminders.ts）
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tomorrowOf } from '../../src/jobs/reminders.ts';
import { canceledByAdminMail, describe, reminderMail } from '../../src/services/booking-mails.ts';

const b = {
  roomName: '会議室A',
  title: '定例',
  startsAt: new Date('2026-12-10T10:00:00+09:00'),
  endsAt: new Date('2026-12-10T11:30:00+09:00'),
};

test('describe: 日本の時刻で、月/日 時刻〜時刻 会議室「題名」', () => {
  assert.equal(describe(b), '12/10 10:00〜11:30 会議室A「定例」');
});

test('reminderMail: 件名に日付。予約を1行ずつ。取り消しのページへのリンク', () => {
  const m = reminderMail('alice@example.com', '2026-12-10', [b, { ...b, title: '1on1' }], 'https://rooms.example.com');
  assert.equal(m.to, 'alice@example.com');
  assert.equal(m.subject, '明日（12/10）の会議室の予約');
  assert.match(m.text, /^- 12\/10 10:00〜11:30 会議室A「定例」$/m);
  assert.match(m.text, /^- 12\/10 10:00〜11:30 会議室A「1on1」$/m);
  assert.match(m.text, /https:\/\/rooms\.example\.com\/mine/);
});

test('canceledByAdminMail', () => {
  const m = canceledByAdminMail('bob@example.com', b, 'https://rooms.example.com');
  assert.equal(m.subject, '予約が取り消されました');
  assert.match(m.text, /12\/10 10:00〜11:30 会議室A「定例」/);
});

test('tomorrowOf: 日本の日付の次の日（UTC では前の日の 15:00 から）', () => {
  assert.equal(tomorrowOf(new Date('2026-12-10T08:59:00Z')), '2026-12-11'); // 日本の 17:59
  assert.equal(tomorrowOf(new Date('2026-12-10T15:00:00Z')), '2026-12-12'); // 日本の 12/11 0:00
});
