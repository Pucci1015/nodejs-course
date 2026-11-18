// API の入力の形（第68章 3.1節。docs/api.md を Zod で書いたもの）
// 形（型・文字数・知らない項目）はここで、時刻の決まり（30 分の区切りなど）は booking-rules.ts で確かめる
import { z } from 'zod';
import { RULES } from './booking-rules.ts';
import { isDateString } from './time.ts';

z.config(z.locales.ja());

const RoomName = z.string().trim().min(1, '名前を入れてください').max(50, '名前は 50 文字までです');
const Capacity = z.int('定員は整数です').min(1, '定員は 1〜100 人です').max(100, '定員は 1〜100 人です');

export const CreateRoomBody = z.strictObject({ name: RoomName, capacity: Capacity });

/** 変えるものだけ送る。何も無ければ 422 */
export const UpdateRoomBody = z
  .strictObject({ name: RoomName, capacity: Capacity, active: z.boolean() })
  .partial()
  .refine((b) => Object.keys(b).length > 0, '変えるものを1つ以上送ってください');

/** 時差の付いた ISO 8601（'2026-12-10T10:00:00+09:00' か '…Z'）。Date にして返す */
const Instant = z.iso
  .datetime({ offset: true, error: '時差の付いた日時（ISO 8601）です' })
  .transform((s) => new Date(s));

export const CreateBookingBody = z.strictObject({
  roomId: z.int().positive(),
  title: z.string().trim().min(1, '題名を入れてください').max(RULES.titleMax, `題名は ${RULES.titleMax} 文字までです`),
  startsAt: Instant,
  endsAt: Instant,
});
export type CreateBookingInput = z.output<typeof CreateBookingBody>;

/** ?date=YYYY-MM-DD（日本の日付） */
export const DateQuery = z.strictObject({
  date: z.string().refine(isDateString, 'YYYY-MM-DD の日付です'),
});

/** パスの :id（1 から始まる数） */
export const IdParam = z.strictObject({
  id: z
    .string()
    .regex(/^[1-9]\d{0,8}$/, '数です')
    .transform(Number),
});
