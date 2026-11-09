// 練習問題4のテスト。本物の端末の代わりに PassThrough を使う
// 使い方: node --test confirm.test.mjs
//         MODULE=../solutions/confirm.mjs node --test confirm.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { pathToFileURL } from 'node:url';

const { confirm, NotInteractiveError } = await import(
  pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './confirm.mjs')).href
);

// 端末のふりをする入力と、書かれた文字を集める出力。
// 質問（"] " で終わる）が出るたびに、answers の次の答えを打つ。null なら入力を終える（Ctrl+D）
function fakeTerminal(answers = [], { tty = true } = {}) {
  const input = new PassThrough();
  input.isTTY = tty;
  const output = new PassThrough();
  const term = { input, output, text: '', asked: 0 };
  output.setEncoding('utf8').on('data', (s) => {
    term.text += s;
    if (!s.endsWith('] ')) return;
    term.asked++;
    const a = answers.shift();
    if (a === null) input.end();
    else if (a !== undefined) input.write(`${a}\n`);
  });
  return term;
}

// 終わらないまま止まっていないかも確かめる
function withTimeout(promise, ms = 1000) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(`${ms}ms 待っても終わりません`)), ms))]);
}

test('y と答えれば true。質問は output に出す', async () => {
  const t = fakeTerminal(['y']);
  assert.equal(await withTimeout(confirm('消しますか？', t)), true);
  assert.equal(t.text, '消しますか？ [y/N] ');
});

test('はいの書き方いろいろ', async () => {
  for (const a of ['Y', 'yes', '  YES  ', 'はい']) {
    assert.equal(await withTimeout(confirm('q', fakeTerminal([a]))), true, a);
  }
});

test('いいえの書き方いろいろ', async () => {
  for (const a of ['n', 'No', 'いいえ']) {
    assert.equal(await withTimeout(confirm('q', fakeTerminal([a]))), false, a);
  }
});

test('何も打たずに Enter なら既定の答え。既定が「はい」なら [Y/n] と出す', async () => {
  assert.equal(await withTimeout(confirm('q', fakeTerminal(['']))), false);
  const t = fakeTerminal(['']);
  assert.equal(await withTimeout(confirm('q', { ...t, defaultAnswer: true })), true);
  assert.equal(t.text, 'q [Y/n] ');
});

test('分からない答えなら、もう一度聞く', async () => {
  const t = fakeTerminal(['うーん', 'y']);
  assert.equal(await withTimeout(confirm('q', t)), true);
  assert.equal(t.asked, 2);
  assert.match(t.text, /y か n で答えてください/);
});

test('3回聞いても分からなければ false', async () => {
  const t = fakeTerminal(['a', 'b', 'c', 'y']);
  assert.equal(await withTimeout(confirm('q', t)), false);
  assert.equal(t.asked, 3);
});

test('答えずに入力が終わったら（Ctrl+D）false。止まったままにならない', async () => {
  assert.equal(await withTimeout(confirm('q', fakeTerminal([null]))), false);
});

test('assumeYes（--yes）なら聞かずに true。何も書かない', async () => {
  const t = fakeTerminal([], { tty: false });
  assert.equal(await withTimeout(confirm('q', { ...t, assumeYes: true })), true);
  assert.equal(t.text, '');
});

test('端末ではなければ NotInteractiveError。勝手に答えを読まない', async () => {
  const t = fakeTerminal(['y'], { tty: false });
  t.input.write('y\n');
  await assert.rejects(withTimeout(confirm('q', t)), (err) => {
    assert.ok(err instanceof NotInteractiveError, String(err));
    assert.match(err.message, /--yes/);
    return true;
  });
  assert.equal(t.text, '');
});

test('同じ入力で、続けて2回聞ける（入力を閉じない）', async () => {
  const t = fakeTerminal(['y', 'n']);
  assert.equal(await withTimeout(confirm('1つ目', t)), true);
  assert.equal(await withTimeout(confirm('2つ目', t)), false);
  assert.equal(t.text, '1つ目 [y/N] 2つ目 [y/N] ');
});
