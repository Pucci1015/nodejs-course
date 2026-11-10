// 練習問題8のテスト。一時フォルダにテンプレートを作り、Express の res.render で確かめる
// 使い方: node --test engine.test.mjs
//         MODULE=../solutions/engine.mjs node --test engine.test.mjs   （解答例で確かめる）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { createEngine } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './engine.mjs')).href);

let dir;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ch23-engine-'));
  const files = {
    'hello.html': '<p>こんにちは、{{ name }}</p>',
    'settings.html': '[{{ settings.env }}][{{ _locals.secret }}][{{ cache }}]',
    'page.html': '<h1>{{ title }}</h1>',
    'base.html': '<html><title>{{ title }}</title><main>{{ body | raw }}</main></html>',
    'broken.html': '<p>{% if x %}閉じていない</p>',
    'counter.html': '回数: {{ n }}',
  };
  for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(dir, name), text);
});
after(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

/** アプリを作って1回 render し、{ status, text } を返す */
async function render(engine, view, locals = {}, { cache = false, resLocals = {} } = {}) {
  const app = express();
  app.set('env', 'test');
  app.engine('html', engine);
  app.set('views', dir);
  app.set('view engine', 'html');
  app.set('view cache', cache);
  app.get('/', (req, res) => {
    Object.assign(res.locals, resLocals);
    res.render(view, locals);
  });
  let error;
  app.use((err, req, res, next) => {
    error = err;
    res.status(500).send('error');
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/`, { signal: AbortSignal.timeout(2000) });
    return { status: res.status, text: await res.text(), error };
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

/** readFile を数える偽物 */
function countingReadFile() {
  const counter = { count: 0 };
  counter.readFile = async (file, enc) => {
    counter.count += 1;
    return fs.readFile(file, enc);
  };
  return counter;
}

test('1. 値を入れて、エスケープして返す', async () => {
  const r = await render(createEngine(), 'hello', { name: '<b>いぬ</b>' });
  assert.equal(r.status, 200);
  assert.equal(r.text, '<p>こんにちは、&lt;b&gt;いぬ&lt;/b&gt;</p>');
});

test('2. Express が混ぜる settings・_locals・cache は、テンプレートから見えない', async () => {
  const r = await render(createEngine(), 'settings', {}, { resLocals: { secret: 'x' } });
  assert.equal(r.text, '[][][]');
});

test('3. res.locals の値は使える', async () => {
  const r = await render(createEngine(), 'hello', {}, { resLocals: { name: 'ねこ' } });
  assert.equal(r.text, '<p>こんにちは、ねこ</p>');
});

test('4. view cache が無効なら、毎回ファイルを読む（書き換えがすぐ反映される）', async () => {
  const c = countingReadFile();
  const engine = createEngine({ readFile: c.readFile });
  await fs.writeFile(path.join(dir, 'counter.html'), '回数: {{ n }}');
  assert.equal((await render(engine, 'counter', { n: 1 })).text, '回数: 1');
  await fs.writeFile(path.join(dir, 'counter.html'), 'かいすう: {{ n }}');
  assert.equal((await render(engine, 'counter', { n: 2 })).text, 'かいすう: 2');
  assert.equal(c.count, 2);
});

test('5. view cache が有効なら、同じファイルは1回だけ読んで compile する', async () => {
  const c = countingReadFile();
  const engine = createEngine({ readFile: c.readFile });
  await fs.writeFile(path.join(dir, 'counter.html'), '回数: {{ n }}');
  assert.equal((await render(engine, 'counter', { n: 1 }, { cache: true })).text, '回数: 1');
  await fs.writeFile(path.join(dir, 'counter.html'), 'かいすう: {{ n }}');
  assert.equal((await render(engine, 'counter', { n: 2 }, { cache: true })).text, '回数: 2');
  assert.equal(c.count, 1);
});

test('6. 同時に来ても、キャッシュが有効なら読むのは1回', async () => {
  const c = countingReadFile();
  const engine = createEngine({ readFile: c.readFile });
  const results = await Promise.all([1, 2, 3].map((n) => render(engine, 'hello', { name: n }, { cache: true })));
  assert.deepEqual(results.map((r) => r.text), [1, 2, 3].map((n) => `<p>こんにちは、${n}</p>`));
  assert.equal(c.count, 1);
});

test('7. layout を指定すると、ページを body としてレイアウトに入れる', async () => {
  const r = await render(createEngine(), 'page', { title: 'A&B', layout: 'base.html' });
  assert.equal(r.text, '<html><title>A&amp;B</title><main><h1>A&amp;B</h1></main></html>');
});

test('8. layout はテンプレートと同じフォルダの中だけ（外を指したら 500）', async () => {
  const r = await render(createEngine(), 'page', { title: 'x', layout: '../outside.html' });
  assert.equal(r.status, 500);
  assert.ok(r.error instanceof Error);
});

test('9. 書き方の誤りは、ファイル名付きのエラーとしてエラーハンドラに届く', async () => {
  const r = await render(createEngine(), 'broken');
  assert.equal(r.status, 500);
  assert.match(r.error.message, /broken\.html/);
  assert.match(r.error.message, /1 行目/);
});

test('10. 書き方を誤ったファイルは、キャッシュが有効でも、直せば次から使える', async () => {
  const engine = createEngine();
  await fs.writeFile(path.join(dir, 'counter.html'), '{% if n %}');
  assert.equal((await render(engine, 'counter', { n: 1 }, { cache: true })).status, 500);
  await fs.writeFile(path.join(dir, 'counter.html'), '直した: {{ n }}');
  assert.equal((await render(engine, 'counter', { n: 1 }, { cache: true })).text, '直した: 1');
});
