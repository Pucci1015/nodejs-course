// 第34章 2.2節で書く、Node.js から Redis のコマンドを送るプログラムの完成形
// 使い方（~/dev/part06/ch34-redis で）: node samples/first-redis.mjs
import { createRedis } from './redis.mjs';

const redis = await createRedis();

// 文字列: SET と GET。値は、いつも文字列で返る
await redis.set('greeting', 'こんにちは');
console.log('GET greeting:', await redis.get('greeting'));
console.log('無いキー:', await redis.get('no-such-key'));

// 期限付き: setEx(キー, 秒, 値)。ttl は残りの秒数（-1 は期限なし、-2 はキーが無い）
await redis.setEx('otp:alice', 30, '123456');
console.log('TTL otp:alice:', await redis.ttl('otp:alice'), ' TTL greeting:', await redis.ttl('greeting'), ' TTL 無いキー:', await redis.ttl('no-such-key'));

// 数: INCR は「読んで 1 足して書く」を1つのコマンドで行う。無いキーは 0 から
await redis.del('views:task:2');
console.log('INCR:', await redis.incr('views:task:2'), await redis.incr('views:task:2'), await redis.incr('views:task:2'));
console.log('GET で読むと文字列:', JSON.stringify(await redis.get('views:task:2')));

// オブジェクトは JSON の文字列にして入れる
const task = { id: 2, title: '本を返す', dueDate: '2026-11-12' };
await redis.set('task:2', JSON.stringify(task));
console.log('JSON で戻す:', JSON.parse(await redis.get('task:2')));

// ハッシュ: 1つのキーの中に、名前と値の組をいくつも持つ（値はやはり文字列）
await redis.hSet('user:alice', { name: 'alice', visits: 1 });
await redis.hIncrBy('user:alice', 'visits', 1);
console.log('HGETALL:', await redis.hGetAll('user:alice'));

// 消す。del は消した数を返す
console.log('DEL:', await redis.del(['greeting', 'otp:alice', 'views:task:2', 'task:2', 'user:alice']));

await redis.close();
