// 7節: 認可の漏れを防ぐ。ほかの人のタスクは「無い」ことにする
// 動かし方: node samples/owner-check.ts   → curl で alice としてログインして試す
import express from 'express';
import session from 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

type Task = { id: number; ownerId: number; title: string };
const users = new Map([
  ['alice', 1],
  ['bob', 2],
]);
const tasks: Task[] = [
  { id: 1, ownerId: 1, title: '牛乳を買う' },
  { id: 2, ownerId: 2, title: 'ねこの病院' },
  { id: 3, ownerId: 1, title: '第55章を読む' },
];

const app = express();
app.use(express.json());
app.use(
  session({ name: 'sid', secret: 'dev-only-session-secret-change-me', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax' } }),
);

// 練習のためのログイン（パスワードは見ない。第51・52章で書いたものの代わり）
app.post('/login', (req, res) => {
  const name: unknown = (req.body as { name?: unknown }).name;
  const userId = typeof name === 'string' ? users.get(name) : undefined;
  if (userId === undefined) return res.status(401).json({ detail: 'ログインできません' });
  req.session.regenerate(() => {
    req.session.userId = userId;
    res.status(204).end();
  });
});

app.use('/api', (req, res, next) => {
  if (req.session.userId === undefined) return res.status(401).json({ detail: 'ログインしてください' });
  next();
});

// 一覧: 自分のものだけ（SQL なら WHERE owner_id = $1）
app.get('/api/tasks', (req, res) => {
  res.json(tasks.filter((t) => t.ownerId === req.session.userId));
});

// 1つ: id だけで探さず、持ち主も条件に入れる。ほかの人のものは 404（403 にすると「ある」ことが分かる）
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id) && t.ownerId === req.session.userId);
  if (task === undefined) return res.status(404).json({ detail: 'タスクがありません' });
  res.json(task);
});

app.listen(9657, '127.0.0.1', () => console.log('http://127.0.0.1:9657'));
