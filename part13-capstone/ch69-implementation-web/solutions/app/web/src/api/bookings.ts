// 会議室と予約の API を呼ぶ関数（第69章 1節。docs/api.md）
import { jsonInit, request } from './client.ts';
import { BookingListSchema, BookingSchema, RoomListSchema, RoomSchema, type Booking, type Room } from './schemas.ts';

export async function listRooms(all: boolean, signal?: AbortSignal): Promise<Room[]> {
  return RoomListSchema.parse(await request(all ? '/rooms?all=1' : '/rooms', { signal })).items;
}

export async function createRoom(input: { name: string; capacity: number }): Promise<Room> {
  return RoomSchema.parse(await request('/rooms', jsonInit('POST', input)));
}

export async function updateRoom(id: number, patch: Partial<Omit<Room, 'id'>>): Promise<Room> {
  return RoomSchema.parse(await request(`/rooms/${id}`, jsonInit('PATCH', patch)));
}

export async function listBookingsOn(date: string, signal?: AbortSignal): Promise<Booking[]> {
  return BookingListSchema.parse(await request(`/bookings?date=${date}`, { signal })).items;
}

export async function listMyBookings(signal?: AbortSignal): Promise<Booking[]> {
  return BookingListSchema.parse(await request('/bookings/mine', { signal })).items;
}

export type NewBooking = { roomId: number; title: string; startsAt: string; endsAt: string };

export async function createBooking(input: NewBooking): Promise<Booking> {
  return BookingSchema.parse(await request('/bookings', jsonInit('POST', input)));
}

export async function cancelBooking(id: number): Promise<void> {
  await request(`/bookings/${id}`, { method: 'DELETE' });
}
