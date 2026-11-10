// 第28章 4節で書く、Hono のアプリを、起動せずに試してから Node.js で動かすプログラムの完成形
// 使い方（~/dev/part05/ch28-framework-map で）: node samples/hono-try.mjs
//   別のターミナルで curl -s http://127.0.0.1:9357/hello/bob
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/hello/:name', (c) => c.json({ message: `こんにちは、${c.req.param('name')} さん` }));
app.post('/echo', async (c) => {
  const body = await c.req.json(); // ボディは、読むときに初めて読む
  return c.json({ you_sent: body }, 201);
});

// app.request: サーバを起動せずに、Web 標準の Response を受け取る
const res = await app.request('/hello/alice');
console.log(res.status, res.headers.get('content-type'), await res.json());

const res2 = await app.request('/echo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ n: 1 }),
});
console.log(res2.status, await res2.json());

console.log(res instanceof Response); // Hono が返したのは、Web 標準の Response そのもの

// 同じアプリを Node.js の HTTP サーバで動かす（@hono/node-server が req・res とつなぐ）
serve({ fetch: app.fetch, port: 9357, hostname: '127.0.0.1' }, () => console.log('http://127.0.0.1:9357/ で待っています'));
