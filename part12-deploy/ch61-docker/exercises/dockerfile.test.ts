// 練習問題5 のテスト
// 使い方: node --test dockerfile.test.ts
//   模範解答を試す: MODULE=../solutions/dockerfile.ts node --test dockerfile.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './dockerfile.ts');
const { parseDockerfile, parseEnv }: typeof import('./dockerfile.ts') = await import(pathToFileURL(file).href);

test('1行に1つの命令。名前は大文字に、行の番号は 1 から', () => {
  assert.deepEqual(parseDockerfile('from node:24-bookworm-slim\nWORKDIR /app\n'), [
    { line: 1, keyword: 'FROM', args: 'node:24-bookworm-slim', stage: 0 },
    { line: 2, keyword: 'WORKDIR', args: '/app', stage: 0 },
  ]);
});

test('# で始まる行と空の行は捨てる（行の番号は数え続ける）', () => {
  const r = parseDockerfile('# コメント\n\nFROM node:24\n  # 字下げしたコメント\nUSER node\n');
  assert.deepEqual(
    r.map((i) => [i.line, i.keyword]),
    [
      [3, 'FROM'],
      [5, 'USER'],
    ],
  );
});

test('行の最後の \\ で、次の行に続く。空白は1つにまとめる', () => {
  const r = parseDockerfile('FROM node:24\nRUN apt-get update \\\n    && apt-get install -y curl \\\n    && rm -rf /var/lib/apt/lists/*\nUSER node\n');
  assert.deepEqual(r[1], { line: 2, keyword: 'RUN', args: 'apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*', stage: 0 });
  assert.deepEqual(r[2], { line: 5, keyword: 'USER', args: 'node', stage: 0 });
});

test('続きの行の途中のコメントの行は捨てる', () => {
  const r = parseDockerfile('RUN echo a \\\n# ここはコメント\n  && echo b\n');
  assert.equal(r[0]?.args, 'echo a && echo b');
});

test('FROM ごとに stage が増える', () => {
  const r = parseDockerfile('FROM node:24 AS build\nRUN npm ci\nFROM node:24-slim\nCOPY --from=build /app /app\n');
  assert.deepEqual(
    r.map((i) => i.stage),
    [0, 0, 1, 1],
  );
});

test('RUN・CMD・ENTRYPOINT の exec の形は、exec に配列を入れる', () => {
  const r = parseDockerfile('CMD ["node", "src/server.ts"]\nENTRYPOINT ["tini", "--"]\nRUN ["npm", "ci"]\nCMD node src/server.ts\nCOPY ["a b", "/app/"]\n');
  assert.deepEqual(r[0]?.exec, ['node', 'src/server.ts']);
  assert.deepEqual(r[1]?.exec, ['tini', '--']);
  assert.deepEqual(r[2]?.exec, ['npm', 'ci']);
  assert.equal(r[3]?.exec, undefined); // シェルの形
  assert.equal(r[4]?.exec, undefined); // COPY には付けない
});

test('[ で始まっても JSON として読めなければ、シェルの形', () => {
  const r = parseDockerfile("CMD ['node', 'x.ts']\n");
  assert.equal(r[0]?.exec, undefined);
});

test('parseEnv: 名前=値 を並べた形', () => {
  assert.deepEqual(parseEnv('NODE_ENV=production HOST=0.0.0.0 PORT=9817'), [
    ['NODE_ENV', 'production'],
    ['HOST', '0.0.0.0'],
    ['PORT', '9817'],
  ]);
});

test('parseEnv: "…" で囲んだ値（空白を含む・空）', () => {
  assert.deepEqual(parseEnv('GREETING="こんにちは 世界" EMPTY=""'), [
    ['GREETING', 'こんにちは 世界'],
    ['EMPTY', ''],
  ]);
});

test('parseEnv: 古い形「名前 値」（= が無い。残り全部が値）', () => {
  assert.deepEqual(parseEnv('MESSAGE hello world'), [['MESSAGE', 'hello world']]);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
