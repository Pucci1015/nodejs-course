// 練習問題3: Fastify で、JSON Schema を書いたアプリを作ってください。
// 要件は README にあります。
// 確かめ方: node --test fastify-basic.test.mjs
import Fastify from 'fastify';

export function buildApp() {
  const app = Fastify({
    ajv: { customOptions: { removeAdditional: false } }, // 知らない項目は断る
  });
  // ここを書く
  return app;
}
