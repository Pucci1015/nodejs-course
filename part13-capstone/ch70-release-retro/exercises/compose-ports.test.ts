// 練習問題6 のテスト。files/compose.yaml・compose.prod.yaml はアプリのコピー、other-compose.yaml は例
// 使い方: node --test compose-ports.test.ts
//   模範解答を試す: MODULE=../solutions/compose-ports.ts node --test compose-ports.test.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './compose-ports.ts');
const mod: typeof import('./compose-ports.ts') = await import(pathToFileURL(file).href);
const { publishedPorts, portConflicts } = mod;

const read = (name: string) => readFile(path.join(import.meta.dirname, 'files', name), 'utf8');
const texts = {
  dev: await read('compose.yaml'),
  prod: await read('compose.prod.yaml'),
  other: await read('other-compose.yaml'),
};
// 書く前の関数は投げるので、テストの中で呼ぶ
const dev = () => publishedPorts('compose.yaml', texts.dev);
const prod = () => publishedPorts('compose.prod.yaml', texts.prod);
const other = () => publishedPorts('other-compose.yaml', texts.other);

test('publishedPorts: アプリの2つのファイル', () => {
  assert.deepEqual(dev(), [
    { file: 'compose.yaml', service: 'db', host: '127.0.0.1', hostPort: 5434, containerPort: 5432 },
    { file: 'compose.yaml', service: 'redis', host: '127.0.0.1', hostPort: 6381, containerPort: 6379 },
  ]);
  assert.deepEqual(
    prod().map((p) => `${p.service} ${p.host}:${p.hostPort}:${p.containerPort}`),
    ['mail 127.0.0.1:9911:8025', 'app 127.0.0.1:9913:9900'],
  );
});

test('publishedPorts: IP の無い形・コンテナの番号だけ', () => {
  assert.deepEqual(
    other().map((p) => `${p.service} ${p.host}:${p.hostPort}:${p.containerPort}`),
    ['db 127.0.0.1:5434:5432', 'redis 0.0.0.0:6382:6379', 'web 0.0.0.0:9911:8080'],
  );
  assert.deepEqual(publishedPorts('x.yaml', 'services:\n  a:\n    image: redis:8\n'), []);
});

test('portConflicts: 同じ番号で、同じ IP か 0.0.0.0', () => {
  assert.deepEqual(portConflicts([...dev(), ...prod()]), [], 'アプリの2つは同時に動かせる');
  assert.deepEqual(portConflicts([...dev(), ...prod(), ...other()]), [
    { hostPort: 5434, users: ['compose.yaml db', 'other-compose.yaml db'] },
    { hostPort: 9911, users: ['compose.prod.yaml mail', 'other-compose.yaml web'] },
  ]);
  const at = (host: string, service: string) => ({ file: 'f', service, host, hostPort: 8000, containerPort: 80 });
  assert.deepEqual(portConflicts([at('127.0.0.1', 'a'), at('127.0.0.2', 'b')]), [], 'IP が違えば、ぶつからない');
  assert.deepEqual(portConflicts([at('127.0.0.1', 'a'), at('127.0.0.2', 'b'), at('0.0.0.0', 'c')]), [
    { hostPort: 8000, users: ['f a', 'f b', 'f c'] },
  ]);
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
