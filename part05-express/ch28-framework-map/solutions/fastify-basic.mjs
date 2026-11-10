// 練習問題3 の模範解答
import Fastify from 'fastify';

export function buildApp() {
  const app = Fastify({
    ajv: { customOptions: { removeAdditional: false } }, // 知らない項目は断る
  });

  app.get('/ping', async () => ({ pong: true }));

  app.post(
    '/notes',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 140 },
            pinned: { type: 'boolean', default: false },
          },
          required: ['text'],
          additionalProperties: false,
        },
        response: {
          201: {
            type: 'object',
            properties: { id: { type: 'integer' }, text: { type: 'string' }, pinned: { type: 'boolean' } },
            required: ['id', 'text', 'pinned'],
          },
        },
      },
    },
    async (req, reply) => {
      const note = { id: 1, text: req.body.text, pinned: req.body.pinned, owner: 'alice' };
      return reply.code(201).send(note);
    },
  );

  return app;
}
