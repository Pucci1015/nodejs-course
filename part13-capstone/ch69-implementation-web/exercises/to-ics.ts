// 第69章 練習問題8: 自分の予約を iCalendar（.ics）にして、カレンダーのアプリに取り込めるようにする
// iCalendar は RFC 5545 で決まっている形。この問題で使う決まりは、下のコメントに全部書いた

export type IcsBooking = { id: number; roomName: string; title: string; startsAt: string; endsAt: string };

/**
 * 予約の一覧を、iCalendar の文字列にする
 * - 行の終わりは CRLF（'\r\n'）。最後の行（END:VCALENDAR）の後にも CRLF
 * - 1つの予約が1つの VEVENT。UID は 'booking-{id}@{host}'、DTSTAMP は now
 * - 日時は UTC の 'YYYYMMDDTHHMMSSZ'（例: 2026-12-10T01:00:00.000Z → 20261210T010000Z）
 * - SUMMARY は題名、LOCATION は会議室の名前。どちらも、\ ; , と改行を、\\ \; \, \n にする
 * - 75 バイト（UTF-8）より長い行は折り返す。続きの行は空白1つで始め、空白を含めて 75 バイトまで。
 *   日本語の文字（3 バイト）を途中で切らない
 */
export function toIcs(bookings: IcsBooking[], options: { now: Date; host: string }): string {
  // ここを書く
  throw new Error(`まだ書いていません（${bookings.length} ${options.host}）`);
}
