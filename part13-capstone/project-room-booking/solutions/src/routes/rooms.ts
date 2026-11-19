// /api/rooms（第68章 6節。docs/api.md の「会議室」）。ログインしている人だけ（app.ts が requireUser を前に置く）
import express from 'express';
import { CreateRoomBody, IdParam, UpdateRoomBody } from '../domain/schemas.ts';
import { HttpProblem } from '../middleware/problem.ts';
import { requireAdmin } from '../middleware/require-admin.ts';
import type { RoomService } from '../services/rooms.ts';

export function createRoomsRouter({ rooms }: { rooms: RoomService }): express.Router {
  const router = express.Router();
  const adminOnly = requireAdmin();

  // ?all=1 は管理者だけ（停止した会議室も見る）。ほかのクエリは知らないので 400
  router.get('/', async (req, res) => {
    const keys = Object.keys(req.query);
    if (keys.some((k) => k !== 'all') || (req.query.all !== undefined && req.query.all !== '1'))
      throw new HttpProblem(400, { detail: '使えるクエリは ?all=1 だけです' });
    const all = req.query.all === '1';
    if (all && req.user?.role !== 'admin') throw new HttpProblem(403, { detail: '管理者だけが使えます' });
    res.json({ items: await rooms.list({ all }) });
  });

  router.post('/', adminOnly, async (req, res) => {
    const room = await rooms.create(CreateRoomBody.parse(req.body));
    res.status(201).location(`/api/rooms/${room.id}`).json(room);
  });

  router.patch('/:id', adminOnly, async (req, res) => {
    const { id } = IdParam.parse(req.params);
    res.json(await rooms.update(id, UpdateRoomBody.parse(req.body)));
  });

  return router;
}
