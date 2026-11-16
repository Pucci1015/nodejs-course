// 練習問題のテストで使う部品（書き換えなくてよい）
// テストごとに、キーの頭に付ける文字列（test:プロセスの番号:でたらめな文字:）を決め、テストが終わったら、
// その頭で始まるキーを全部消して、接続を閉じる。ほかのキー（本文で作ったものなど）には触らない
import { createClient } from 'redis';

export const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380';

async function connect() {
  const client = createClient({ url: REDIS_URL, socket: { reconnectStrategy: false, connectTimeout: 2000 } });
  client.on('error', () => {}); // エラーは connect や各コマンドの reject で受け取る
  try {
    await client.connect();
  } catch (err) {
    throw new Error(`Redis につながりません（${REDIS_URL}）。~/dev/part06 で docker compose up -d --wait を動かしてから、もう一度試してください`, {
      cause: err,
    });
  }
  return client;
}

/**
 * テスト用の Redis の接続を作る。t（テストの文脈）を渡すと、テストの後で片付ける
 * 戻り値: { redis, prefix, newClient }。キーは必ず prefix で始める。newClient() で、別の接続をもう1本作れる
 * @param {import('node:test').TestContext} t
 */
export async function createTestRedis(t) {
  const prefix = `test:${process.pid}:${Math.random().toString(36).slice(2, 8)}:`;
  const clients = [];
  const newClient = async () => {
    const client = await connect();
    clients.push(client);
    return client;
  };
  const redis = await newClient();
  t.after(async () => {
    const cleaner = await connect();
    for await (const keys of cleaner.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
      if (keys.length > 0) await cleaner.del(keys);
    }
    await cleaner.close();
    for (const client of clients) if (client.isOpen) await client.close().catch(() => client.destroy());
  });
  return { redis, prefix, newClient };
}
