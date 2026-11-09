// 練習問題4: Fastify の JSON Schema で、入力を確かめ、出力を「決めた項目だけ」にする
// 要件は exercises/README.md の問題4です。確かめ方:
//   $ node --test fastify-users.test.mjs
// 今のひな形は、スキーマを1つも書いていません。
import Fastify from 'fastify';

export function createApp({ users }) {
  const app = Fastify({ logger: false });

  app.get('/users', async (req) => ({ items: users.slice(0, Number(req.query.limit ?? 20)) }));

  app.get('/users/:id', async (req, reply) => {
    const user = users.find((u) => u.id === Number(req.params.id));
    if (!user) return reply.code(404).send({ error: 'not_found' });
    return user;
  });

  app.post('/users', async (req, reply) => {
    const user = { id: users.length + 1, passwordHash: 'dev-only-not-a-real-hash', role: 'member', ...req.body };
    users.push(user);
    return reply.code(201).send(user);
  });

  // ここを書く: スキーマ、エラーの返し方
  return app;
}
