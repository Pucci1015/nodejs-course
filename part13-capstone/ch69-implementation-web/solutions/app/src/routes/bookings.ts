// /api/bookings（第68章 6節。docs/api.md の「予約」）。ログインしている人だけ（app.ts が requireUser を前に置く）
import express, { type Request } from 'express';
import { CreateBookingBody, DateQuery, IdParam } from '../domain/schemas.ts';
import { HttpProblem } from '../middleware/problem.ts';
import type { Actor, BookingService } from '../services/bookings.ts';

/** ログインしている人（requireUser の後ろなので、いるはず） */
function actorOf(req: Request): Actor {
  if (req.user === undefined) throw new HttpProblem(401, { detail: 'ログインしてください' });
  return { id: req.user.id, role: req.user.role };
}

export function createBookingsRouter({ bookings }: { bookings: BookingService }): express.Router {
  const router = express.Router();

  // ?date= が無い・正しくないのは、ボディではなくクエリの間違いなので 400（errors[].parameter）
  router.get('/', async (req, res) => {
    const q = DateQuery.safeParse(req.query);
    if (!q.success)
      throw new HttpProblem(400, {
        detail: '?date=YYYY-MM-DD を付けてください',
        errors: q.error.issues.map((i) => ({ parameter: String(i.path[0] ?? ''), detail: i.message })),
      });
    res.json({ items: await bookings.listOnDay(actorOf(req), q.data.date) });
  });

  // /mine は /:id より前に書く（後ろだと、'mine' が :id として読まれる）
  router.get('/mine', async (req, res) => {
    res.json({ items: await bookings.listMine(actorOf(req)) });
  });

  router.get('/:id', async (req, res) => {
    const { id } = IdParam.parse(req.params);
    res.json(await bookings.get(actorOf(req), id));
  });

  router.post('/', async (req, res) => {
    const booking = await bookings.create(actorOf(req), CreateBookingBody.parse(req.body));
    res.status(201).location(`/api/bookings/${booking.id}`).json(booking);
  });

  router.delete('/:id', async (req, res) => {
    const { id } = IdParam.parse(req.params);
    await bookings.cancel(actorOf(req), id);
    res.status(204).end();
  });

  return router;
}
