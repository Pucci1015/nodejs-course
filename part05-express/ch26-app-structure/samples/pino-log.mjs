// 第26章 6節で書く、pino で1行1つの JSON のログを書くアプリの完成形
// 使い方（~/dev/part05/ch26-app-structure で）: node samples/pino-log.mjs → curl -i http://127.0.0.1:9337/hello
import crypto from 'node:crypto';
import express from 'express';
import pino from 'pino';

const PORT = 9337;
const logger = pino({ level: 'info' });
const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  req.log = logger.child({ reqId: req.id }); // ここから書くログには、いつも reqId が付く
  const start = performance.now();
  res.once('close', () => {
    req.log.info({ method: req.method, path: req.path, status: res.statusCode, ms: Math.round(performance.now() - start) }, 'request');
  });
  next();
});

app.get('/hello', (req, res) => {
  req.log.debug('debug は level が info なので書かれない');
  req.log.info({ name: 'alice' }, 'あいさつします');
  res.json({ message: 'こんにちは' });
});

app.listen(PORT, '127.0.0.1', () => logger.info({ port: PORT }, '起動しました'));
