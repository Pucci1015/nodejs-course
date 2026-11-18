// その日の予約の表（第69章 3節。docs/screens.md の「/ その日の予約」）
// 行は 30 分の枠、列は会議室。予約は、続く枠を rowSpan でまとめて1つのセルにする
import type { ReactNode } from 'react';
import type { Booking, Room } from '../api/schemas.ts';
import { markBusy, slotsOfDay, type Slot } from '../domain/slots.ts';

type Props = {
  date: string;
  rooms: Room[];
  bookings: Booking[];
  now: Date;
  onPick: (room: Room, slot: Slot) => void;
};

export function DayGrid({ date, rooms, bookings, now, onPick }: Props): ReactNode {
  const slots = slotsOfDay(date);
  // 会議室ごとに、枠に重なる予約（無ければ null）
  const columns = rooms.map((room) =>
    markBusy(
      slots,
      bookings.filter((b) => b.roomId === room.id),
    ),
  );

  return (
    <table className="day-grid">
      <caption className="visually-hidden">会議室ごとの予約（30 分ずつ）</caption>
      <thead>
        <tr>
          <th scope="col">時刻</th>
          {rooms.map((room) => (
            <th key={room.id} scope="col">
              {room.name}（{room.capacity}人）
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {slots.map((slot, i) => (
          <tr key={slot.label}>
            <th scope="row">{slot.label}</th>
            {rooms.map((room, r) => {
              const busy = columns[r] ?? [];
              const booking = busy[i] ?? null;
              if (booking !== null) {
                // 上の枠と同じ予約なら、上のセルが rowSpan で覆っているので、セルを出さない
                if (i > 0 && busy[i - 1] === booking) return null;
                let span = 1;
                while (busy[i + span] === booking) span++;
                return (
                  <td key={room.id} rowSpan={span} className={booking.mine ? 'booked mine' : 'booked'}>
                    {booking.title}
                    {booking.mine && '（自分）'}
                  </td>
                );
              }
              // 過ぎた枠はボタンにしない
              if (slot.start.getTime() <= now.getTime()) return <td key={room.id} className="past" />;
              return (
                <td key={room.id}>
                  <button
                    type="button"
                    className="slot"
                    aria-label={`${room.name} ${slot.label} から予約`}
                    onClick={() => onPick(room, slot)}
                  >
                    空き
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
