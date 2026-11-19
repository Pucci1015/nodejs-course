// 第69章 練習問題8 の模範解答: 自分の予約を iCalendar（.ics）にする（RFC 5545）

export type IcsBooking = { id: number; roomName: string; title: string; startsAt: string; endsAt: string };

/** 2026-12-10T01:00:00.000Z → 20261210T010000Z */
const stamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** TEXT の値のエスケープ（RFC 5545 3.3.11）。\ を最初にする（後で足した \ を2重にしないため） */
const text = (s: string) =>
  s.replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replace(/\r?\n/g, '\\n');

/** 75 バイトで折り返す（RFC 5545 3.1）。文字（コードポイント）ごとに数えるので、日本語を途中で切らない */
function fold(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    if (bytes + size > 75) {
      out.push(current);
      current = ' '; // 続きの行は空白1つで始める（空白も 1 バイト数える）
      bytes = 1;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out;
}

export function toIcs(bookings: IcsBooking[], options: { now: Date; host: string }): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//room-booking//JA'];
  for (const b of bookings) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:booking-${b.id}@${options.host}`,
      `DTSTAMP:${stamp(options.now)}`,
      `DTSTART:${stamp(new Date(b.startsAt))}`,
      `DTEND:${stamp(new Date(b.endsAt))}`,
      `SUMMARY:${text(b.title)}`,
      `LOCATION:${text(b.roomName)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines
    .flatMap(fold)
    .map((l) => `${l}\r\n`)
    .join('');
}
