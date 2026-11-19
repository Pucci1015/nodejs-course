// API の応答の形と、フォームの入力の形（第43章 1.2節・5.1節）
// API の docs/api.md と同じ形。API の側を変えたら、ここも直す（docs/adr/0001-stack.md）
import { z } from 'zod';

z.config(z.locales.ja());

export const RoomSchema = z.object({ id: z.number(), name: z.string(), capacity: z.number(), active: z.boolean() });
export type Room = z.infer<typeof RoomSchema>;
export const RoomListSchema = z.object({ items: z.array(RoomSchema) });

export const BookingSchema = z.object({
  id: z.number(),
  roomId: z.number(),
  roomName: z.string(),
  title: z.string(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  mine: z.boolean(),
});
export type Booking = z.infer<typeof BookingSchema>;
export const BookingListSchema = z.object({ items: z.array(BookingSchema) });

/** 予約のダイアログの入力 */
export const BookingInputSchema = z.object({
  title: z.string().trim().min(1, '題名を入れてください').max(100, '題名は 100 文字までです'),
});

/** 会議室のフォームの入力（定員は文字で入るので、数にする） */
export const RoomInputSchema = z.object({
  name: z.string().trim().min(1, '名前を入れてください').max(50, '名前は 50 文字までです'),
  capacity: z
    .string()
    .regex(/^\d{1,3}$/, '定員は 1〜100 の数です')
    .transform(Number)
    .pipe(z.number().min(1, '定員は 1〜100 の数です').max(100, '定員は 1〜100 の数です')),
});
