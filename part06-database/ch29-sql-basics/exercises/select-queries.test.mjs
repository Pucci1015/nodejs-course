// 練習問題1 用: select-queries.mjs のテスト
// 使い方: node --test select-queries.test.mjs
//   模範解答を試す: MODULE=../solutions/select-queries.mjs node --test select-queries.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBooksDb } from './books.mjs';

const q = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './select-queries.mjs')).href);

// node:sqlite の行は「プロトタイプの無いオブジェクト」なので、ふつうのオブジェクトに直して比べる
function run(sql) {
  const db = createBooksDb();
  try {
    return db.prepare(sql).all().map((row) => ({ ...row }));
  } finally {
    db.close();
  }
}

test('unread: 未読の本の title を、title の順に', () => {
  assert.deepEqual(run(q.unread), [
    { title: 'Node.js 入門' },
    { title: 'SQL の練習帳' },
    { title: 'Web の仕組み' },
    { title: 'パンの教科書' },
    { title: '海の地図' },
  ]);
});

test('recent: 2020 年以降の本の title と year を、新しい順に 3 冊', () => {
  assert.deepEqual(run(q.recent), [
    { title: 'SQL の練習帳', year: 2024 },
    { title: 'Node.js 入門', year: 2023 },
    { title: 'Web の仕組み', year: 2022 },
  ]);
});

test('aboutSql: title に SQL を含む本の id と title を、id の順に', () => {
  assert.deepEqual(run(q.aboutSql), [
    { id: 1, title: 'はじめての SQL' },
    { id: 8, title: 'SQL の練習帳' },
  ]);
});

test('thickTech: tech で 300 ページ以上の本の title と pages を、pages の多い順に', () => {
  assert.deepEqual(run(q.thickTech), [
    { title: 'Node.js 入門', pages: 350 },
    { title: 'Web の仕組み', pages: 330 },
    { title: 'やさしい統計', pages: 310 },
  ]);
});
