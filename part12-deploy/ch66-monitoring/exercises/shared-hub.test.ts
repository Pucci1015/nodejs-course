// 練習問題8 のテスト: 本物の Redis（127.0.0.1:6380）で、2 台ぶんのハブを動かす
// 使い方: node --test shared-hub.test.ts
//   模範解答を試す: MODULE=../solutions/shared-hub.ts node --test shared-hub.test.ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createClient } from 'redis';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './shared-hub.ts');
const { createSharedHub }: typeof import('./shared-hub.ts') = await import(pathToFileURL(file).href);

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380';
const clients: { isOpen: boolean; close(): Promise<void> }[] = [];
after(async () => {
  for (const c of clients) if (c.isOpen) await c.close();
});

async function client() {
  const c = createClient({ url: REDIS_URL });
  clients.push(c);
  await c.connect();
  return c;
}

/** 1 台ぶんのハブ（publisher と subscriber の 2 本の接続） */
async function instance(channel: string) {
  const hub = createSharedHub({ publisher: await client(), subscriber: await client(), channel });
  await hub.start();
  return hub;
}

const newChannel = () => `test:${process.pid}:${randomBytes(3).toString('hex')}:tasks`;
const settle = () => new Promise((r) => setTimeout(r, 100));

test('台 a で publish した知らせが、台 b の、その人の客に届く', async () => {
  const ch = newChannel();
  const [a, b] = [await instance(ch), await instance(ch)];
  const got: unknown[] = [];
  b.subscribe('alice', (e) => got.push(e));
  await a.publish('alice', { type: 'task.updated', data: { id: 1, title: '豆乳を買う' } });
  await settle();
  assert.deepEqual(got, [{ type: 'task.updated', data: { id: 1, title: '豆乳を買う' } }]);
  await a.close();
  await b.close();
});

test('自分の台の客にも、1 回だけ届く', async () => {
  const ch = newChannel();
  const a = await instance(ch);
  const got: unknown[] = [];
  a.subscribe('alice', (e) => got.push(e));
  await a.publish('alice', { type: 'task.created', data: { id: 2 } });
  await settle();
  assert.equal(got.length, 1);
  await a.close();
});

test('ほかの人の知らせは届かない。同じ人の客が 2 つなら、両方に届く', async () => {
  const ch = newChannel();
  const [a, b] = [await instance(ch), await instance(ch)];
  const alice1: unknown[] = [];
  const alice2: unknown[] = [];
  const bob: unknown[] = [];
  a.subscribe('alice', (e) => alice1.push(e));
  b.subscribe('alice', (e) => alice2.push(e));
  b.subscribe('bob', (e) => bob.push(e));
  await a.publish('alice', { type: 'task.deleted', data: { id: 3 } });
  await settle();
  assert.equal(alice1.length, 1);
  assert.equal(alice2.length, 1);
  assert.equal(bob.length, 0);
  await a.close();
  await b.close();
});

test('外したら、もう届かない', async () => {
  const ch = newChannel();
  const a = await instance(ch);
  const got: unknown[] = [];
  const off = a.subscribe('alice', (e) => got.push(e));
  off();
  await a.publish('alice', { type: 'x', data: null });
  await settle();
  assert.equal(got.length, 0);
  await a.close();
});

test('形の違うメッセージ（JSON でない・項目が無い）は、捨てて落ちない', async () => {
  const ch = newChannel();
  const a = await instance(ch);
  const got: unknown[] = [];
  a.subscribe('alice', (e) => got.push(e));
  const raw = await client();
  await raw.publish(ch, 'not json');
  await raw.publish(ch, JSON.stringify({ userId: 'alice' }));
  await raw.publish(ch, JSON.stringify({ userId: 'alice', event: { type: '', data: 1 } }));
  await a.publish('alice', { type: 'ok', data: 1 });
  await settle();
  assert.deepEqual(got, [{ type: 'ok', data: 1 }]);
  await a.close();
});

test('1 人の客が例外を投げても、ほかの客に届く', async () => {
  const ch = newChannel();
  const a = await instance(ch);
  const got: unknown[] = [];
  a.subscribe('alice', () => {
    throw new Error('この客は壊れています');
  });
  a.subscribe('alice', (e) => got.push(e));
  await a.publish('alice', { type: 'ok', data: 1 });
  await settle();
  assert.equal(got.length, 1);
  await a.close();
});

test('close したら、もう届かない', async () => {
  const ch = newChannel();
  const [a, b] = [await instance(ch), await instance(ch)];
  const got: unknown[] = [];
  b.subscribe('alice', (e) => got.push(e));
  await b.close();
  await a.publish('alice', { type: 'x', data: null });
  await settle();
  assert.equal(got.length, 0);
  await a.close();
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
