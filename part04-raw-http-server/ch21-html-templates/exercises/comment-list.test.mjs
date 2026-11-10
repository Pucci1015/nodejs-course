// 練習問題2 用: comment-list.mjs のテスト
// 使い方: node --test comment-list.test.mjs
//   模範解答を試す: MODULE=../solutions/comment-list.mjs node --test comment-list.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SafeHtml } from '../samples/mini-html.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './comment-list.mjs')).href);

test('commentItem: 名前と本文を出す', () => {
  assert.equal(String(m.commentItem({ name: 'alice', text: 'こんにちは', starred: false })),
    '<li class="comment"><b>alice</b>: こんにちは</li>');
});

test('commentItem: starred なら class に starred を足す', () => {
  assert.equal(String(m.commentItem({ name: 'bob', text: 'いいね', starred: true })),
    '<li class="comment starred"><b>bob</b>: いいね</li>');
});

test('commentItem: 名前と本文をエスケープする', () => {
  assert.equal(String(m.commentItem({ name: '<carol>', text: 'Tom & Jerry', starred: false })),
    '<li class="comment"><b>&lt;carol&gt;</b>: Tom &amp; Jerry</li>');
});

test('commentItem: 結果は SafeHtml', () => {
  assert.ok(m.commentItem({ name: 'a', text: 'b', starred: false }) instanceof SafeHtml);
});

test('commentList: <ul> の中に並べる（二重にエスケープしない）', () => {
  const out = m.commentList([
    { name: 'alice', text: 'a & b', starred: false },
    { name: 'bob', text: 'c', starred: true },
  ]);
  assert.ok(out instanceof SafeHtml);
  assert.equal(String(out),
    '<ul class="comments"><li class="comment"><b>alice</b>: a &amp; b</li><li class="comment starred"><b>bob</b>: c</li></ul>');
});

test('commentList: 0件なら「コメントはありません」', () => {
  assert.equal(String(m.commentList([])), '<p class="empty">コメントはありません</p>');
});
