// 第34章 4.1節で書く、「読んで足して書く」と INCR の違いを確かめるプログラムの完成形
// 使い方（~/dev/part06/ch34-redis で）: node samples/counter-race.mjs
import { createRedis } from './redis.mjs';

const redis = await createRedis();
await redis.del(['count:slow', 'count:incr']);

// 1. GET で読み、JavaScript で 1 足して、SET で書く。100 個を同時に動かす
await Promise.all(
  Array.from({ length: 100 }, async () => {
    const n = Number((await redis.get('count:slow')) ?? 0);
    await redis.set('count:slow', String(n + 1));
  }),
);
console.log('GET して SET:', await redis.get('count:slow'));

// 2. INCR は、Redis の中で「読んで足して書く」を1つのコマンドで行う
await Promise.all(Array.from({ length: 100 }, () => redis.incr('count:incr')));
console.log('INCR:        ', await redis.get('count:incr'));

await redis.del(['count:slow', 'count:incr']);
await redis.close();
