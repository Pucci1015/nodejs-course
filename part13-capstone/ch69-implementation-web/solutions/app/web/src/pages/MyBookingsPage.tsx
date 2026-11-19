// 自分の予約（/mine。第69章 5節）。これからの予約を早い順に。取り消す前に確かめる
import { useState, type ReactNode } from 'react';
import { useCancelBooking, useMyBookings } from '../api/queries.ts';
import type { Booking } from '../api/schemas.ts';
import { useAnnounce } from '../components/Announcer.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { PageTitle } from '../components/PageTitle.tsx';
import { hhmm, tokyoParts } from '../domain/time.ts';
import { errorMessage } from '../lib/errors.ts';
import { formatDay, useNow } from '../lib/now.ts';

/** '12/10（木）10:00〜11:00 会議室A' */
function when(b: Booking): string {
  const s = tokyoParts(new Date(b.startsAt));
  const e = tokyoParts(new Date(b.endsAt));
  return `${formatDay(s.date)} ${hhmm(s.minutes)}〜${hhmm(e.minutes)} ${b.roomName}`;
}

export function MyBookingsPage(): ReactNode {
  const now = useNow();
  const mine = useMyBookings();
  const cancel = useCancelBooking();
  const announce = useAnnounce();
  const [target, setTarget] = useState<Booking | null>(null);

  return (
    <>
      <PageTitle>自分の予約</PageTitle>
      {mine.isPending ? (
        <p>読み込み中…</p>
      ) : mine.isError ? (
        <p role="alert">{errorMessage(mine.error)}</p>
      ) : mine.data.length === 0 ? (
        <p>これからの予約はありません。</p>
      ) : (
        <ul className="my-bookings">
          {mine.data.map((b) => (
            <li key={b.id}>
              {when(b)} 「{b.title}」{' '}
              {new Date(b.startsAt).getTime() <= now.getTime() ? (
                <span className="muted">（使用中）</span>
              ) : (
                <button
                  type="button"
                  className="danger"
                  onClick={() => setTarget(b)}
                  aria-label={`「${b.title}」を取り消す`}
                >
                  取り消す
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={target !== null}
        title="予約を取り消しますか？"
        confirmLabel="取り消す"
        onCancel={() => setTarget(null)}
        onConfirm={() => {
          if (target === null) return;
          cancel.mutate(target.id, {
            onSuccess: () => announce('予約を取り消しました'),
            onError: (err) => announce(errorMessage(err)),
          });
          setTarget(null);
        }}
      >
        {target !== null && <p>{`${when(target)} 「${target.title}」`}</p>}
      </ConfirmDialog>
    </>
  );
}
