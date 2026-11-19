// 予約のサービス（第68章 5節）。docs/requirements.md の決まり R1〜R9 を守らせる
// Express も Zod も知らない。だれが（actor）・何を・いつ（now）を受け取る
import { canCancel, checkBookingTime, RULES, type Role } from '../domain/booking-rules.ts';
import { dayRange, tokyoParts } from '../domain/time.ts';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors.ts';
import type { BookingRecord, BookingRepo } from '../repositories/pg-bookings.ts';
import type { RoomRepo } from '../repositories/pg-rooms.ts';

/** 操作する人 */
export type Actor = { id: number; role: Role };

/** API が返す予約。だれの予約かは出さず、自分のものかだけを出す（要件 5節の個人情報） */
export type Booking = {
  id: number;
  roomId: number;
  roomName: string;
  title: string;
  startsAt: string;
  endsAt: string;
  mine: boolean;
};

const toBooking = (b: BookingRecord, actor: Actor): Booking => ({
  id: b.id,
  roomId: b.roomId,
  roomName: b.roomName,
  title: b.title,
  startsAt: b.startsAt.toISOString(),
  endsAt: b.endsAt.toISOString(),
  mine: b.userId === actor.id,
});

/** 知らせ（SSE で全員に配る。第69章 2節）。画面は、date の日を表示していたら読み直す */
export type BookingEvent = { id: number; roomId: number; date: string };
export type Publish = (type: 'booking.created' | 'booking.canceled', data: BookingEvent) => void;

export type BookingServiceDeps = {
  bookings: BookingRepo;
  rooms: RoomRepo;
  now?: () => Date;
  /** 予約が入った・取り消されたことを知らせる（待たない。失敗しても予約は成功のまま） */
  publish?: Publish;
  /** 管理者が、ほかの人の予約を取り消したとき（予約した人にメールを送る。第69章 4節） */
  onCanceledByOther?: (b: BookingRecord) => void;
};

const eventOf = (b: { id: number; roomId: number; startsAt: Date }): BookingEvent => ({
  id: b.id,
  roomId: b.roomId,
  date: tokyoParts(b.startsAt).date,
});

export function createBookingService({
  bookings,
  rooms,
  now = () => new Date(),
  publish = () => {},
  onCanceledByOther = () => {},
}: BookingServiceDeps) {
  return {
    /** その日（日本の日付）の、全部の会議室の予約 */
    async listOnDay(actor: Actor, date: string): Promise<Booking[]> {
      const { from, to } = dayRange(date);
      return (await bookings.listBetween(from, to)).map((b) => toBooking(b, actor));
    },

    /** 自分の、これからの予約 */
    async listMine(actor: Actor): Promise<Booking[]> {
      return (await bookings.listUpcomingOf(actor.id, now())).map((b) => toBooking(b, actor));
    },

    /** 1つの予約。取り消したものは無いのと同じ */
    async get(actor: Actor, id: number): Promise<Booking> {
      const b = await bookings.get(id);
      if (b === null || b.canceledAt !== null) throw new NotFoundError('予約がありません');
      return toBooking(b, actor);
    },

    async create(
      actor: Actor,
      input: { roomId: number; title: string; startsAt: Date; endsAt: Date },
    ): Promise<Booking> {
      const at = now();
      // R1〜R4: 時刻の決まり（合わないところを全部返す）
      const issues = checkBookingTime(input.startsAt, input.endsAt, at);
      if (issues.length > 0) throw new ValidationError('予約の時刻が決まりに合いません', undefined, issues);
      // R8: 会議室があって、使えるか
      const room = await rooms.get(input.roomId);
      if (room === null) throw new NotFoundError('会議室がありません');
      if (!room.active) throw new ConflictError('この会議室は、今は使えません');
      // R7: 1人 10 件まで（同時に2件入れると 11 件になりうる。要件で許した。docs/data.md）
      if ((await bookings.countUpcomingOf(actor.id, at)) >= RULES.maxUpcomingPerUser)
        throw new ConflictError(`これからの予約は ${RULES.maxUpcomingPerUser} 件までです`);
      // R6: 重なりは、データベースの制約が断る（リポジトリが ConflictError にする）
      const id = await bookings.insert({ ...input, userId: actor.id });
      publish('booking.created', eventOf({ id, roomId: room.id, startsAt: input.startsAt }));
      return {
        id,
        roomId: room.id,
        roomName: room.name,
        title: input.title,
        startsAt: input.startsAt.toISOString(),
        endsAt: input.endsAt.toISOString(),
        mine: true,
      };
    },

    /** R9: 取り消せるのは本人か管理者。始まったものはだめ */
    async cancel(actor: Actor, id: number): Promise<BookingRecord> {
      const b = await bookings.get(id);
      if (b === null) throw new NotFoundError('予約がありません');
      switch (canCancel(b, actor, now())) {
        case 'forbidden':
          throw new ForbiddenError('自分の予約だけを取り消せます');
        case 'canceled':
          throw new ConflictError('この予約は、もう取り消してあります');
        case 'started':
          throw new ConflictError('始まった予約は取り消せません');
        case 'ok':
          break;
      }
      // 確かめてから取り消すまでの間に、ほかの人が取り消していたら false
      if (!(await bookings.cancel(id, actor.id))) throw new ConflictError('この予約は、もう取り消してあります');
      publish('booking.canceled', eventOf(b));
      if (b.userId !== actor.id) onCanceledByOther(b);
      return b;
    },
  };
}

export type BookingService = ReturnType<typeof createBookingService>;
