// 会議室のサービス（第68章 5節）。だれが使えるか（管理者だけ）は、ルートの requireAdmin が決める
import { NotFoundError } from '../errors.ts';
import type { Room, RoomFields, RoomRepo } from '../repositories/pg-rooms.ts';

export function createRoomService(repo: RoomRepo) {
  return {
    list: (options: { all?: boolean } = {}): Promise<Room[]> => repo.list(options),

    create: (fields: Pick<Room, 'name' | 'capacity'>): Promise<Room> => repo.insert(fields),

    async update(id: number, fields: Partial<RoomFields>): Promise<Room> {
      const room = await repo.update(id, fields);
      if (room === null) throw new NotFoundError('会議室がありません');
      return room;
    },
  };
}

export type RoomService = ReturnType<typeof createRoomService>;
