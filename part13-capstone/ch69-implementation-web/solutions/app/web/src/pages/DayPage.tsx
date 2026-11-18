// その日の予約（/。第69章 3節）。日付は URL の ?date= に持つ（第44章 4節）
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useDayBookings, useRooms } from '../api/queries.ts';
import type { Room } from '../api/schemas.ts';
import { BookingDialog } from '../components/BookingDialog.tsx';
import { DayGrid } from '../components/DayGrid.tsx';
import { PageTitle } from '../components/PageTitle.tsx';
import type { Slot } from '../domain/slots.ts';
import { addDays, isDateString, tokyoParts } from '../domain/time.ts';
import { errorMessage } from '../lib/errors.ts';
import { formatDay, useNow } from '../lib/now.ts';

export function DayPage(): ReactNode {
  const now = useNow();
  const today = tokyoParts(now).date;
  const [params, setParams] = useSearchParams();
  const asked = params.get('date');
  // 正しくない ?date= は、今日として扱う
  const date = asked !== null && isDateString(asked) ? asked : today;
  const rooms = useRooms();
  const bookings = useDayBookings(date);
  const [picked, setPicked] = useState<{ room: Room; slot: Slot } | null>(null);

  const go = (d: string) => setParams(d === today ? {} : { date: d });

  return (
    <>
      <PageTitle>その日の予約</PageTitle>
      <p className="day-nav">
        <button type="button" onClick={() => go(addDays(date, -1))}>
          ← 前の日
        </button>{' '}
        <strong aria-live="polite">{formatDay(date)}</strong>{' '}
        <button type="button" onClick={() => go(addDays(date, 1))}>
          次の日 →
        </button>{' '}
        <button type="button" onClick={() => go(today)} disabled={date === today}>
          今日
        </button>
      </p>
      {rooms.isPending || bookings.isPending ? (
        <p>読み込み中…</p>
      ) : rooms.isError || bookings.isError ? (
        <p role="alert">{errorMessage(rooms.error ?? bookings.error)}</p>
      ) : rooms.data.length === 0 ? (
        <p>会議室がまだありません。管理者に足してもらってください。</p>
      ) : (
        <DayGrid
          date={date}
          rooms={rooms.data}
          bookings={bookings.data}
          now={now}
          onPick={(room, slot) => setPicked({ room, slot })}
        />
      )}
      {picked !== null && (
        <BookingDialog room={picked.room} slot={picked.slot} now={now} onClose={() => setPicked(null)} />
      )}
    </>
  );
}
