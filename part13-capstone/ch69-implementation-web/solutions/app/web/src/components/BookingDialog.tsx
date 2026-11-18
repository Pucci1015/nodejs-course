// 予約のダイアログ（第69章 4節。docs/screens.md の「予約する」）
// 会議室・始まりは押した枠で決まる。題名と長さを選んで「予約する」
// 送る前に、API と同じ決まり（domain/ のコピー）で確かめる。それでも API が断ったら（409・422）、その理由を出す
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, toFieldErrors } from '../api/client.ts';
import { useCreateBooking } from '../api/queries.ts';
import { BookingInputSchema, type Room } from '../api/schemas.ts';
import { checkBookingTime, RULES } from '../domain/booking-rules.ts';
import type { Slot } from '../domain/slots.ts';
import { hhmm, tokyoParts } from '../domain/time.ts';
import { errorMessage } from '../lib/errors.ts';
import { useAnnounce } from './Announcer.tsx';
import { Field } from './Field.tsx';

type Props = { room: Room; slot: Slot; now: Date; onClose: () => void };

/** 選べる長さ（30 分〜3 時間）。21:00 を過ぎるものは出さない */
function lengthsFrom(slot: Slot): number[] {
  const start = tokyoParts(slot.start).minutes;
  const out: number[] = [];
  for (let m = RULES.minMinutes; m <= RULES.maxMinutes && start + m <= RULES.closeMinutes; m += RULES.slotMinutes)
    out.push(m);
  return out;
}

const lengthLabel = (m: number) =>
  m < 60 ? `${m} 分` : m % 60 === 0 ? `${m / 60} 時間` : `${Math.floor(m / 60)} 時間 30 分`;

export function BookingDialog({ room, slot, now, onClose }: Props): ReactNode {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const lengthId = useId();
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(() => Math.min(60, lengthsFrom(slot).at(-1) ?? RULES.minMinutes)); // 既定は 1 時間
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const create = useCreateBooking();
  const announce = useAnnounce();
  const startMinutes = tokyoParts(slot.start).minutes;

  // 開いたら showModal。閉じるときは、開く前にフォーカスのあった枠のボタンへ戻す（第45章 6節）
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const before = document.activeElement;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (before instanceof HTMLElement) before.focus();
    };
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    setAlert(null);
    const input = BookingInputSchema.safeParse({ title });
    const endsAt = new Date(slot.start.getTime() + minutes * 60_000);
    const issues = checkBookingTime(slot.start, endsAt, now);
    const next: Record<string, string> = {};
    if (!input.success) next['title'] = input.error.issues[0]?.message ?? '題名を確かめてください';
    if (issues.length > 0) setAlert(issues[0]?.message ?? null);
    setErrors(next);
    if (!input.success || issues.length > 0) return;

    create.mutate(
      { roomId: room.id, title: input.data.title, startsAt: slot.start.toISOString(), endsAt: endsAt.toISOString() },
      {
        onSuccess: () => {
          announce(`${room.name} ${slot.label}〜${hhmm(startMinutes + minutes)} を予約しました`);
          onClose();
        },
        onError: (err) => {
          // 422 は項目ごとに。題名のほかの項目（時刻）の理由は、上にまとめて出す
          if (err instanceof ApiError && err.status === 422) {
            const fields = toFieldErrors(err.problem);
            setErrors(fields['title'] !== undefined ? { title: fields['title'] } : {});
            const other = Object.entries(fields).find(([k]) => k !== 'title');
            setAlert(other?.[1] ?? null);
          } else setAlert(errorMessage(err)); // 409（重なった・10 件まで・停止した会議室）など
        },
      },
    );
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault(); // Esc。開け閉めは親が決める
        onClose();
      }}
    >
      <h2 id={titleId}>
        {room.name} {slot.label} から予約
      </h2>
      <form onSubmit={submit} noValidate>
        {alert !== null && <p role="alert">{alert}</p>}
        <Field
          label="題名"
          name="title"
          type="text"
          value={title}
          onChange={setTitle}
          error={errors['title']}
          autoComplete="off"
        />
        <p>
          <label htmlFor={lengthId}>長さ</label>
          <br />
          <select id={lengthId} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {lengthsFrom(slot).map((m) => (
              <option key={m} value={m}>
                {lengthLabel(m)}（〜{hhmm(startMinutes + m)}）
              </option>
            ))}
          </select>
        </p>
        <div>
          <button type="button" onClick={onClose}>
            キャンセル
          </button>{' '}
          <button type="submit" disabled={create.isPending}>
            予約する
          </button>
        </div>
      </form>
    </dialog>
  );
}
