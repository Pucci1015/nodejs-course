// 第28章 3節で書く、Fastify の JSON Schema で入力と出力を決めるプログラムの完成形
// 使い方（~/dev/part05/ch28-framework-map で）: node samples/fastify-try.mjs   （ポートは開かない）
import Fastify from 'fastify';

const app = Fastify({
  ajv: { customOptions: { removeAdditional: false } }, // 知らない項目は、黙って消さずに断る
});

const User = {
  type: 'object',
  properties: { id: { type: 'integer' }, name: { type: 'string' } },
  required: ['id', 'name'],
};

app.post(
  '/users',
  {
    schema: {
      body: {
        type: 'object',
        properties: { name: { type: 'string', minLength: 1, maxLength: 20 } },
        required: ['name'],
        additionalProperties: false,
      },
      response: { 201: User }, // ここに書いていない項目は、応答に出ない
    },
  },
  async (req, reply) => {
    const user = { id: 1, name: req.body.name, passwordHash: 'dev-only-hash' }; // データベースから読んだ行のつもり
    return reply.code(201).send(user);
  },
);

// app.inject: ポートを開かずに、リクエストを送ったことにして試す
for (const body of [{ name: 'alice' }, { name: '' }, { name: 'bob', role: 'admin' }]) {
  const res = await app.inject({ method: 'POST', url: '/users', payload: body });
  console.log(JSON.stringify(body), '→', res.statusCode, res.body);
}
