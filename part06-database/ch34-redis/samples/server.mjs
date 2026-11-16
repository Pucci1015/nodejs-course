// 第34章 5.2節で書く、セッションと回数の制限を Redis に置く Express のサーバの完成形
// 2つ動かして、どちらにつないでも同じセッション・同じ数になることを確かめる
// 使い方（~/dev/part06/ch34-redis で）:
//   ターミナル1: node samples/server.mjs              （ポート 9457）
//   ターミナル2: PORT=9458 node samples/server.mjs    （ポート 9458）
import express from 'express';
import { createRedis } from './redis.mjs';
import { createSessionStore } from './session-store.mjs';

const PORT = Number(process.env.PORT ?? 9457);
const redis = await createRedis();
const store = createSessionStore(redis, { ttlSec: 30 * 60 });

// Cookie の見出しから、名前が name の値を取り出す（第22章 2節の parseCookies を短くしたもの）
function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

// 回数の制限（4.2節）。数は Redis にあるので、サーバが何台あっても、合わせて数えられる
function rateLimit({ name, limit, windowSec }) {
  return async (req, res, next) => {
    const key = `rate:${name}:${req.ip}`;
    const [count, , ttl] = await redis.multi().incr(key).expire(key, windowSec, 'NX').ttl(key).exec();
    if (count > limit) {
      res.set('Retry-After', String(ttl));
      return res.status(429).json({ error: 'too many requests', retryAfter: ttl });
    }
    next();
  };
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.post('/login', rateLimit({ name: 'login', limit: 5, windowSec: 60 }), async (req, res) => {
  const name = req.body?.name;
  if (typeof name !== 'string' || !/^[a-z]{1,20}$/.test(name)) return res.status(422).json({ error: 'name は英小文字 1〜20 文字です' });
  // この教材では、パスワードの確かめは省く（第10部で扱う）
  await store.destroy(readCookie(req, 'sid')); // 前のセッションは消して、新しい ID にする（セッション固定化の対策。第22章 6.2節）
  const sid = await store.create({ name, loginAt: new Date().toISOString() });
  res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 60 * 1000 });
  res.json({ name, servedBy: PORT });
});

app.get('/me', async (req, res) => {
  const session = await store.get(readCookie(req, 'sid'));
  if (!session) return res.status(401).json({ error: 'ログインしていません' });
  // 全部のサーバで合わせた、このユーザーの /me の回数
  const visits = await redis.incr(`visits:${session.name}`);
  res.json({ ...session, visits, servedBy: PORT });
});

app.post('/logout', async (req, res) => {
  await store.destroy(readCookie(req, 'sid'));
  res.clearCookie('sid');
  res.sendStatus(204);
});

const server = app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));

process.on('SIGINT', () => {
  server.close(async () => {
    await redis.close();
    process.exit(0);
  });
});
