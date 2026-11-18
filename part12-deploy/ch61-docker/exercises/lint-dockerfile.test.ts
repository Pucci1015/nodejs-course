// 練習問題6 のテスト（問題5の dockerfile.ts を先に書いてください）
// 使い方: node --test lint-dockerfile.test.ts
//   模範解答を試す: MODULE=../solutions/lint-dockerfile.ts node --test lint-dockerfile.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './lint-dockerfile.ts');
const { lintDockerfile }: typeof import('./lint-dockerfile.ts') = await import(pathToFileURL(file).href);

const GOOD = `FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
RUN npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
USER node
CMD ["node", "src/server.ts"]
`;

test('問題の無い Dockerfile は []', () => {
  assert.deepEqual(lintDockerfile(GOOD), []);
});

test('FROM に版が無い・latest', () => {
  assert.deepEqual(lintDockerfile('FROM node\nUSER node\nCMD ["node", "a.ts"]\n'), [{ line: 1, message: 'FROM のイメージに版（タグ）を付けてください' }]);
  assert.deepEqual(lintDockerfile('FROM node:latest AS x\nUSER node\nCMD ["node", "a.ts"]\n'), [{ line: 1, message: 'FROM のイメージに版（タグ）を付けてください' }]);
  // 前の段階の名前を使う FROM と、@sha256: で決めたものはよい
  assert.deepEqual(lintDockerfile('FROM node:24 AS build\nFROM build\nUSER node\nCMD ["node", "a.ts"]\n'), []);
  assert.deepEqual(lintDockerfile('FROM node@sha256:abc\nUSER node\nCMD ["node", "a.ts"]\n'), []);
});

test('最後の段階に USER が無い・USER root', () => {
  assert.deepEqual(lintDockerfile('FROM node:24 AS build\nUSER node\nFROM node:24\nCMD ["node", "a.ts"]\n'), [
    { line: 3, message: '最後の段階に USER がありません（root で動きます）' },
  ]);
  assert.deepEqual(lintDockerfile('FROM node:24\nUSER node\nUSER root\nCMD ["node", "a.ts"]\n'), [
    { line: 1, message: '最後の段階に USER がありません（root で動きます）' },
  ]);
});

test('CMD・ENTRYPOINT がシェルの形', () => {
  assert.deepEqual(lintDockerfile('FROM node:24\nUSER node\nCMD npm start\n'), [{ line: 3, message: 'CMD は ["node", "…"] の形（exec の形）で書いてください' }]);
  assert.deepEqual(lintDockerfile('FROM node:24\nUSER node\nENTRYPOINT node a.ts\n'), [
    { line: 3, message: 'ENTRYPOINT は ["node", "…"] の形（exec の形）で書いてください' },
  ]);
});

test('同じ段階で、COPY . の後に npm ci・npm install', () => {
  const r = lintDockerfile('FROM node:24\nWORKDIR /app\nCOPY . .\nRUN npm ci\nUSER node\nCMD ["node", "a.ts"]\n');
  assert.deepEqual(r, [{ line: 4, message: 'package.json だけを先にコピーしてから npm ci してください（キャッシュが効きません）' }]);
});

test('npm install を使っている', () => {
  const r = lintDockerfile('FROM node:24\nCOPY package.json ./\nRUN npm install --omit=dev\nUSER node\nCMD ["node", "a.ts"]\n');
  assert.deepEqual(r, [{ line: 3, message: 'npm install ではなく npm ci を使ってください' }]);
});

test('ENV・ARG に秘密らしい名前（SECRET・PASSWORD・TOKEN・KEY を含む）', () => {
  const r = lintDockerfile('FROM node:24\nARG NPM_TOKEN\nENV NODE_ENV=production SESSION_SECRET=x\nENV API_KEY abc\nUSER node\nCMD ["node", "a.ts"]\n');
  assert.deepEqual(r, [
    { line: 2, message: '秘密の値（NPM_TOKEN）をイメージに入れないでください' },
    { line: 3, message: '秘密の値（SESSION_SECRET）をイメージに入れないでください' },
    { line: 4, message: '秘密の値（API_KEY）をイメージに入れないでください' },
  ]);
});

test('見つけたものは、行の番号の順', () => {
  const r = lintDockerfile('FROM node\nCOPY . .\nRUN npm install\nENV DB_PASSWORD=x\nCMD npm start\n');
  assert.deepEqual(
    r.map((p) => p.line),
    [1, 1, 3, 3, 4, 5],
  );
});

test('本文の Dockerfile（../samples/app/Dockerfile）には何も見つからない', async () => {
  const text = await readFile(path.join(import.meta.dirname, '../samples/app/Dockerfile'), 'utf8');
  assert.deepEqual(lintDockerfile(text), []);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
