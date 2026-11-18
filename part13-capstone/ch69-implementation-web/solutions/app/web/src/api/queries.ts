// TanStack Query のフック（第43章 3〜7節）
// ログインしている人（useMe）とログアウト（useLogout）、会議室と予約（第69章）
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getMe, logout } from './auth.ts';
import {
  cancelBooking,
  createBooking,
  createRoom,
  listBookingsOn,
  listMyBookings,
  listRooms,
  updateRoom,
  type NewBooking,
} from './bookings.ts';
import type { Room } from './schemas.ts';

/** キャッシュのキー。予約が変わったら ['bookings'] の下を全部読み直す */
export const roomKeys = {
  all: ['rooms'] as const,
  list: (all: boolean) => ['rooms', { all }] as const,
};
export const bookingKeys = {
  all: ['bookings'] as const,
  day: (date: string) => ['bookings', 'day', date] as const,
  mine: ['bookings', 'mine'] as const,
};

export function useRooms({ all = false }: { all?: boolean } = {}) {
  return useQuery({ queryKey: roomKeys.list(all), queryFn: ({ signal }) => listRooms(all, signal) });
}

export function useDayBookings(date: string) {
  return useQuery({ queryKey: bookingKeys.day(date), queryFn: ({ signal }) => listBookingsOn(date, signal) });
}

export function useMyBookings() {
  return useQuery({ queryKey: bookingKeys.mine, queryFn: ({ signal }) => listMyBookings(signal) });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewBooking) => createBooking(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelBooking(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; capacity: number }) => createRoom(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Omit<Room, 'id'>> }) => updateRoom(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
  });
}

/**
 * ほかの人が予約・取り消したら、SSE で知らせてもらい、予約のキャッシュを「古い」にする（第43章 7節）。
 * 表示している日の表は、すぐ読み直される。reset（知らせを取りこぼした）でも、全部を読み直す
 */
export function useBookingEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const source = new EventSource('/api/events');
    const refresh = () => void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    for (const type of ['booking.created', 'booking.canceled', 'reset']) source.addEventListener(type, refresh);
    return () => source.close();
  }, [queryClient]);
}

/**
 * ログインしている人。サーバが知っていること（サーバの状態）なので、Context ではなく TanStack Query に置く（第44章 6節）。
 * どの部品からでも useMe() で読め、ログイン・ログアウトしたら、このキャッシュを書き換えるだけで、全部の画面が変わる
 */
export const meKey = ['me'] as const;

export function useMe() {
  return useQuery({ queryKey: meKey, queryFn: ({ signal }) => getMe(signal), staleTime: 60_000 });
}

/** ログアウト。前の人のデータがキャッシュに残らないように全部消してから、「ログインしていない」にする */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== meKey[0] });
      queryClient.setQueryData(meKey, null);
    },
  });
}
