// 第9部の練習用の API（http://127.0.0.1:9500）。第7部の成果物と同じ API を、データベースなしで動かす（第8部の api/ と同じもの）
//   起動: ~/dev/part09 で npm run api（止めるのは Ctrl+C）。PORT=9516 npm run api のように、ポートを変えられる
//   データはメモリに置くので、止めると消える。起動するたびに、例のタスクを5つ入れる（SEED=0 で入れない）
//   API_DELAY_MS=1500 npm run api のように、応答を遅らせられる（「読み込み中」の画面を確かめるため）
// 中身は第7部の成果物の src/ のコピー。替えたのは、データの層（repositories/memory-tasks.ts）と、この起動のファイルだけ
import type { AddressInfo } from 'node:net';
import express from 'express';
import pino from 'pino';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createEventHub, sseRoute } from './lib/event-hub.ts';
import { createIdempotencyStore } from './middleware/idempotency.ts';
import { createMemoryTaskRepo } from './repositories/memory-tasks.ts';
import { createTaskService } from './services/tasks.ts';

// 決まりの値。環境変数で上書きできる
const config = loadConfig({
  PORT: '9500',
  CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
  LOG_LEVEL: 'warn',
  RATE_LIMIT_PER_MINUTE: '600',
  ...process.env,
});
const delayMs = Number(process.env.API_DELAY_MS ?? 0);

const logger = pino({ level: config.logLevel });
const hub = createEventHub({ bufferSize: 100 });
const repo = createMemoryTaskRepo();
const service = createTaskService({ repo, clock: () => new Date(), maxDoing: config.maxDoing, publish: (type, task) => hub.publish(type, task) });
const sse = sseRoute(hub, { heartbeatMs: config.sseHeartbeatMs });
const api = createApp({ service, sse, logger, config, idempotencyStore: createIdempotencyStore() });

// 例のタスク（締め切りは、今日から数えた日付）
if (process.env.SEED !== '0') {
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  const seeds = [
    { title: '牛乳を買う', dueDate: day(1) },
    { title: '第9部を読む', dueDate: day(7) },
    { title: '部屋の掃除', dueDate: null },
    { title: 'レポートを出す', dueDate: day(3) },
    { title: '本を返す', dueDate: null },
  ];
  for (const s of seeds) await service.create(s);
  const second = await service.get(2);
  await service.update(2, { status: 'doing' }, { expectedVersion: second.version });
}

const app = express();
if (delayMs > 0) app.use((_req, _res, next) => void setTimeout(next, delayMs));
app.use(api);

const server = app.listen(config.port, config.host, () => {
  const { port } = server.address() as AddressInfo;
  console.log(`練習用の API: http://${config.host}:${port}/api/tasks （止めるのは Ctrl+C）`);
});
server.on('error', (err) => {
  console.error(`起動できませんでした: ${err.message}`);
  process.exit(1);
});
process.on('SIGINT', () => {
  sse.closeAll();
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  sse.closeAll();
  server.close(() => process.exit(0));
});
