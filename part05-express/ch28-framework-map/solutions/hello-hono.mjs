// 練習問題2 の模範解答
import { Hono } from 'hono';

const INT = /^-?[0-9]{1,9}$/;

export function createHelloApp() {
  const app = new Hono();

  app.get('/hello/:name', (c) => c.json({ message: `こんにちは、${c.req.param('name')} さん` }));

  app.get('/add', (c) => {
    const a = c.req.query('a') ?? '';
    const b = c.req.query('b') ?? '';
    if (!INT.test(a) || !INT.test(b)) return c.json({ error: 'a と b は整数です' }, 400);
    return c.json({ sum: Number(a) + Number(b) });
  });

  app.delete('/items/:id', (c) => c.body(null, 204));

  return app;
}
