// 練習問題6 のテスト（子のプログラムを本当に起動するので、全部で数秒かかります）
// 使い方: node --test supervise.test.ts
//   模範解答を試す: MODULE=../solutions/supervise.ts node --test supervise.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './supervise.ts');
const { supervise }: typeof import('./supervise.ts') = await import(pathToFileURL(file).href);
type SuperviseEvent = import('./supervise.ts').SuperviseEvent;

const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('すぐ落ちる子: 待つ時間を倍にしながら起動し直し、上限を超えたらあきらめる', async () => {
  const events: SuperviseEvent[] = [];
  const s = supervise({ script: fixture('exit1.ts'), baseDelayMs: 20, maxDelayMs: 1000, maxRestarts: 3, stableMs: 5000, onEvent: (e) => events.push(e) });
  const result = await s.done;
  assert.deepEqual(result, { reason: 'gave-up', restarts: 3 });
  assert.equal(events.filter((e) => e.type === 'start').length, 4);
  assert.deepEqual(
    events.filter((e) => e.type === 'wait'),
    [
      { type: 'wait', delayMs: 20, restarts: 1 },
      { type: 'wait', delayMs: 40, restarts: 2 },
      { type: 'wait', delayMs: 80, restarts: 3 },
    ],
  );
  assert.deepEqual(events.at(-1), { type: 'give-up', restarts: 3 });
  const exits = events.filter((e) => e.type === 'exit');
  assert.ok(exits.every((e) => e.code === 1));
});

test('待つ時間は maxDelayMs で止まる', async () => {
  const events: SuperviseEvent[] = [];
  const s = supervise({ script: fixture('exit1.ts'), baseDelayMs: 10, maxDelayMs: 30, maxRestarts: 4, stableMs: 5000, onEvent: (e) => events.push(e) });
  await s.done;
  assert.deepEqual(
    events.flatMap((e) => (e.type === 'wait' ? [e.delayMs] : [])),
    [10, 20, 30, 30],
  );
});

test('stop(): 子に SIGTERM を送り、子が終わってから解決する。起動し直さない', async () => {
  const events: SuperviseEvent[] = [];
  const s = supervise({ script: fixture('stay.ts'), baseDelayMs: 10, maxDelayMs: 100, maxRestarts: 3, stableMs: 5000, onEvent: (e) => events.push(e) });
  await sleep(300);
  await s.stop();
  assert.deepEqual(await s.done, { reason: 'stopped', restarts: 0 });
  assert.deepEqual(
    events.map((e) => e.type),
    ['start', 'exit'],
  );
  const exit = events[1];
  assert.ok(exit?.type === 'exit' && exit.code === 0, JSON.stringify(exit));
});

test('しばらく動いてから落ちた（stableMs より長い）なら、続けて落ちた回数を 0 に戻す', async () => {
  const events: SuperviseEvent[] = [];
  const s = supervise({
    script: fixture('flaky.ts'),
    env: { ...process.env, RUN_MS: '150' },
    baseDelayMs: 10,
    maxDelayMs: 100,
    maxRestarts: 1,
    stableMs: 50,
    onEvent: (e) => events.push(e),
  });
  await sleep(1500);
  await s.stop();
  const result = await s.done;
  assert.equal(result.reason, 'stopped');
  assert.ok(result.restarts >= 2, `restarts: ${result.restarts}`);
  // 毎回、1回目の待ち時間（10 ms）に戻っている
  assert.ok(events.filter((e) => e.type === 'wait').every((e) => e.type === 'wait' && e.delayMs === 10 && e.restarts === 1));
});

test('待っている間に stop() したら、もう起動しない', async () => {
  const events: SuperviseEvent[] = [];
  const s = supervise({ script: fixture('exit1.ts'), baseDelayMs: 500, maxDelayMs: 500, maxRestarts: 5, stableMs: 5000, onEvent: (e) => events.push(e) });
  await sleep(250); // 最初の子が落ちて、500 ms 待っているところ
  await s.stop();
  assert.equal((await s.done).reason, 'stopped');
  await sleep(600);
  assert.equal(events.filter((e) => e.type === 'start').length, 1);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
