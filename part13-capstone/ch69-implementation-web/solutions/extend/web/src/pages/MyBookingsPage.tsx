// 自分の予約（/mine。第69章 5節）。これからの予約を早い順に。取り消す前に確かめる
// 変更（練習問題7）: 日付ごとに見出し（h2）と一覧に分けた。行には日付を書かない
import { Fragment, useState, type ReactNode } from 'react';
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

// 追加（練習問題7）: 日付を除いた '10:00〜11:00 会議室A'
function timeAndRoom(b: Booking): string {
  const s = tokyoParts(new Date(b.startsAt));
  const e = tokyoParts(new Date(b.endsAt));
  return `${hhmm(s.minutes)}〜${hhmm(e.minutes)} ${b.roomName}`;
}

// 追加（練習問題7）: 日本の日付ごとにまとめる。API は始まりの早い順に返すので、Map も日付の早い順になる
function byDay(list: Booking[]): [string, Booking[]][] {
  return [...Map.groupBy(list, (b) => tokyoParts(new Date(b.startsAt)).date)];
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
        // 変更（練習問題7）: 日付ごとに h2 と ul。ul の名前は aria-labelledby で見出しにする
        byDay(mine.data).map(([date, list]) => (
          <Fragment key={date}>
            <h2 id={`day-${date}`}>{formatDay(date)}</h2>
            <ul className="my-bookings" aria-labelledby={`day-${date}`}>
              {list.map((b) => (
                <li key={b.id}>
                  {timeAndRoom(b)} 「{b.title}」{' '}
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
          </Fragment>
        ))
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
        {/* 確かめるダイアログには、日付も入れたまま（どの日の予約かが分かるように） */}
        {target !== null && <p>{`${when(target)} 「${target.title}」`}</p>}
      </ConfirmDialog>
    </>
  );
}
