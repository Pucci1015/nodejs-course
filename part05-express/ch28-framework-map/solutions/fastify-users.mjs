// 練習問題4の模範解答: Fastify の JSON Schema で、入力を確かめ、出力を「決めた項目だけ」にする
import Fastify from 'fastify';

// 修正: 返すユーザーの形。ここに無い項目（passwordHash・email）は、JSON にするときに捨てられる
const PublicUser = {
  type: 'object',
  properties: { id: { type: 'integer' }, name: { type: 'string' } },
  required: ['id', 'name'],
};

/** @param {{ users: Array<{ id: number, name: string, email: string, passwordHash: string }> }} deps */
export function createApp({ users }) {
  const app = Fastify({
    logger: false,
    // 修正: 知らない項目を黙って取り除かず、断る
    ajv: { customOptions: { removeAdditional: false } },
  });

  app.get(
    '/users',
    {
      schema: {
        // 修正: type: 'integer' だと、' 20'・'2e1' も 20 にしてしまう（型を変える coerceTypes）。文字の形で決める
        querystring: {
          type: 'object',
          properties: { limit: { type: 'string', pattern: '^[1-9][0-9]?$|^100$' } },
          additionalProperties: false,
        },
        response: { 200: { type: 'object', properties: { items: { type: 'array', items: PublicUser } } } },
      },
    },
    async (req) => ({ items: users.slice(0, Number(req.query.limit ?? 20)) }),
  );

  app.get(
    '/users/:id',
    { schema: { params: { type: 'object', properties: { id: { type: 'string', pattern: '^[1-9][0-9]{0,8}$' } } }, response: { 200: PublicUser } } },
    async (req, reply) => {
      const user = users.find((u) => u.id === Number(req.params.id));
      if (!user) return reply.code(404).send({ error: 'not_found' });
      return user; // passwordHash を持ったまま返しても、スキーマにある項目だけが JSON になる
    },
  );

  app.post(
    '/users',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50 },
            email: { type: 'string', format: 'email', maxLength: 254 },
          },
          required: ['name', 'email'],
          additionalProperties: false, // 修正: role: 'admin' などを送られても、受け取らない
        },
        response: { 201: PublicUser },
      },
    },
    async (req, reply) => {
      const user = { id: users.length + 1, name: req.body.name, email: req.body.email, passwordHash: 'dev-only-not-a-real-hash', role: 'member' };
      users.push(user);
      return reply.code(201).send(user);
    },
  );

  // 追加: スキーマに合わないとき、場所で分ける（URL は 400、ボディは 422。第25章 3.3節）
  app.setErrorHandler((err, req, reply) => {
    if (err.validation) {
      const status = err.validationContext === 'body' ? 422 : err.validationContext === 'params' ? 404 : 400;
      return reply.code(status).send({ error: 'invalid', where: err.validationContext, detail: err.message });
    }
    if (err.statusCode >= 400 && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.code });
    reply.code(500).send({ error: 'internal' });
  });
  return app;
}
