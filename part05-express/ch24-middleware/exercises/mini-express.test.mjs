// 練習問題7のテスト
// 使い方: node --test mini-express.test.mjs
//         MODULE=../solutions/mini-express.mjs node --test mini-express.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { createMiniExpress } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './mini-express.mjs')).href);

/** app を起動して、requests を順に送り、[{ status, text }] を返す */
async function run(app, requests) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const out = [];
  try {
    for (const r of requests) {
      const [method, url] = typeof r === 'string' ? ['GET', r] : r;
      try {
        const res = await fetch(base + url, { method, signal: AbortSignal.timeout(1500) });
        out.push({ status: res.status, text: await res.text() });
      } catch (err) {
        out.push({ status: 'error', text: err.name }); // 接続が切られた・応答が無い
      }
    }
  } finally {
    server.closeAllConnections();
    server.close();
  }
  return out;
}

const send = (text) => (req, res) => res.end(text);

test('1. app は関数で、ミドルウェアは登録した順に動き、next() で次へ進む', async () => {
  const app = createMiniExpress();
  assert.equal(typeof app, 'function');
  const trace = [];
  app.use((req, res, next) => {
    trace.push('a');
    next();
  });
  app.use((req, res, next) => {
    trace.push('b');
    next();
  }, (req, res) => {
    trace.push('c');
    res.end('done');
  });
  const [r] = await run(app, ['/x']);
  assert.equal(r.text, 'done');
  assert.deepEqual(trace, ['a', 'b', 'c']);
});

test('2. use も get も、返り値は app（つなげて書ける）', () => {
  const app = createMiniExpress();
  assert.equal(app.use(() => {}), app);
  assert.equal(app.get('/', () => {}), app);
});

test('3. 誰も応答しなければ 404「Cannot GET /パス」', async () => {
  const app = createMiniExpress();
  app.use((req, res, next) => next());
  const [r] = await run(app, ['/nothing?q=1']);
  assert.equal(r.status, 404);
  assert.equal(r.text, 'Cannot GET /nothing');
});

test('4. ルートはメソッドとパスで選ぶ。:名前 は req.params に（%xx は戻す）', async () => {
  const app = createMiniExpress();
  app.get('/users/:id', (req, res) => res.end(`user ${req.params.id}`));
  app.post('/users', send('created'));
  app.get('/users/:id/posts/:postId', (req, res) => res.end(`${req.params.id}-${req.params.postId}`));
  const rs = await run(app, ['/users/%E8%8A%B1', ['POST', '/users'], '/users/7/posts/9', ['DELETE', '/users/7'], '/users/7/x', '/users', '/users/7?tab=a']);
  assert.deepEqual(rs.map((r) => r.text), ['user 花', 'created', '7-9', 'Cannot DELETE /users/7', 'Cannot GET /users/7/x', 'Cannot GET /users', 'user 7']);
});

test('5. HEAD は GET のルートで答える', async () => {
  const app = createMiniExpress();
  app.get('/h', send('body'));
  const [r] = await run(app, [['HEAD', '/h']]);
  assert.equal(r.status, 200);
});

test('6. use(パス) は、そのパスと、その下だけ。/adminx にはあてはまらない', async () => {
  const app = createMiniExpress();
  app.use('/admin', send('admin'));
  app.use(send('other'));
  const rs = await run(app, ['/admin', '/admin/', '/admin/users', '/adminx', '/']);
  assert.deepEqual(rs.map((r) => r.text), ['admin', 'admin', 'admin', 'other', 'other']);
});

test('7. use(パス) の中では、req.url から前置きを取り除き、req.baseUrl に入れる。抜けたら元に戻す', async () => {
  const app = createMiniExpress();
  const seen = [];
  app.use('/shop', (req, res, next) => {
    seen.push(`${req.baseUrl}|${req.url}`);
    next();
  });
  app.use((req, res) => {
    seen.push(`${req.baseUrl ?? ''}|${req.url}`);
    res.end('ok');
  });
  await run(app, ['/shop/items?x=1', '/shop']);
  assert.deepEqual(seen, ['/shop|/items?x=1', '|/shop/items?x=1', '/shop|/', '|/shop']);
});

test('8. ハンドラの中の throw と、async の reject は、エラーハンドラ（引数4つ）へ', async () => {
  const app = createMiniExpress();
  app.get('/sync', () => {
    throw new Error('sync');
  });
  app.get('/async', async () => {
    await null;
    throw new Error('async');
  });
  app.use((err, req, res, next) => res.end(`handled ${err.message}`));
  const rs = await run(app, ['/sync', '/async']);
  assert.deepEqual(rs.map((r) => r.text), ['handled sync', 'handled async']);
});

test('9. next(err) の後は、引数が3つ以下のものを飛ばし、引数4つのものだけを順に動かす', async () => {
  const app = createMiniExpress();
  const trace = [];
  app.use((req, res, next) => next(new Error('x')));
  app.use((req, res, next) => {
    trace.push('normal');
    next();
  });
  app.use((err, req, res, next) => {
    trace.push('e1');
    next(err);
  });
  app.get('/', () => trace.push('route'));
  app.use((err, req, res, next) => {
    trace.push('e2');
    res.end('e2');
  });
  const [r] = await run(app, ['/']);
  assert.equal(r.text, 'e2');
  assert.deepEqual(trace, ['e1', 'e2']);
});

test('10. エラーがないときは、引数4つのものを飛ばす。エラーハンドラが next() すると、ふつうの流れに戻る', async () => {
  const app = createMiniExpress();
  const trace = [];
  app.use((err, req, res, next) => trace.push('never'));
  app.use((req, res, next) => next(new Error('x')));
  app.use((err, req, res, next) => {
    trace.push('recover');
    next();
  });
  app.use((req, res) => {
    trace.push('after');
    res.end('after');
  });
  const [r] = await run(app, ['/']);
  assert.equal(r.text, 'after');
  assert.deepEqual(trace, ['recover', 'after']);
});

test('11. 誰も受け止めなかったエラーは 500「Internal Server Error」。err.status が 400〜599 ならそのステータス', async () => {
  const app = createMiniExpress();
  app.get('/plain', () => {
    throw new Error('secret detail');
  });
  app.get('/teapot', () => {
    throw Object.assign(new Error('teapot'), { status: 418 });
  });
  app.get('/weird', () => {
    throw Object.assign(new Error('weird'), { status: 200 });
  });
  const rs = await run(app, ['/plain', '/teapot', '/weird']);
  assert.deepEqual(rs.map((r) => [r.status, r.text]), [
    [500, 'Internal Server Error'],
    [418, 'Internal Server Error'],
    [500, 'Internal Server Error'],
  ]);
});

test('12. 途中まで送った後のエラーは、接続を切る（壊れた応答を正しい応答に見せない）', async () => {
  const app = createMiniExpress();
  app.get('/half', (req, res) => {
    res.writeHead(200, { 'Content-Length': 10 });
    res.write('abc');
    throw new Error('途中で失敗');
  });
  const [r] = await run(app, ['/half']);
  assert.equal(r.status, 'error');
});

test("13. next('route') は、そのルートの残りを飛ばして、次の層へ", async () => {
  const app = createMiniExpress();
  app.get('/r', (req, res, next) => next('route'), send('skipped'));
  app.get('/r', send('next route'));
  const [r] = await run(app, ['/r']);
  assert.equal(r.text, 'next route');
});

test('14. 同じ next を2回呼んでも、次の層は1回しか動かない', async () => {
  const app = createMiniExpress();
  let count = 0;
  app.use((req, res, next) => {
    next();
    next();
  });
  app.use((req, res) => {
    count += 1;
    res.end(String(count));
  });
  const [r] = await run(app, ['/']);
  assert.equal(r.text, '1');
  assert.equal(count, 1);
});
