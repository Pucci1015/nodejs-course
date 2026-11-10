// 4つのサーバが、同じ約束（契約）を守っているかを、同じテストで確かめる（第28章 6節）
//   $ node --test samples/contract.test.mjs
import { contract } from './contract.mjs';

const servers = ['./express-tasks.mjs', './fastify-tasks.mjs', './hono-tasks.mjs', './web-handler-tasks.mjs'];
for (const file of servers) {
  const { listen } = await import(new URL(file, import.meta.url).href);
  contract(file, () => listen(0));
}
