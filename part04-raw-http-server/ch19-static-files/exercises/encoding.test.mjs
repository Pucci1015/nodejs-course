// 練習問題6のテスト
// 使い方: node --test encoding.test.mjs
//         MODULE=../solutions/encoding.mjs node --test encoding.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { negotiateEncoding } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './encoding.mjs')).href);
const n = (h, a) => negotiateEncoding(h, a);

test('Accept-Encoding が無い・空なら identity（圧縮しない）', () => {
  assert.equal(n(undefined), 'identity');
  assert.equal(n(''), 'identity');
  assert.equal(n('   '), 'identity');
});

test('1つだけ・知らないものだけ', () => {
  assert.equal(n('gzip'), 'gzip');
  assert.equal(n('br'), 'br');
  assert.equal(n('deflate'), 'identity');
  assert.equal(n('GZIP'), 'gzip'); // 大文字と小文字は区別しない
});

test('q が同じなら、サーバの好み（available の順）', () => {
  assert.equal(n('gzip, br'), 'br');
  assert.equal(n('gzip, deflate, br, zstd'), 'br'); // ブラウザがよく送る形
  assert.equal(n('gzip;q=0.8, br;q=0.8'), 'br');
  assert.equal(n('gzip, br', ['gzip', 'br']), 'gzip');
});

test('q の大きい方', () => {
  assert.equal(n('br;q=0.5, gzip'), 'gzip');
  assert.equal(n('br;q=0.9, gzip;q=0.1'), 'br');
  assert.equal(n('gzip; q=0.5, br; q=0.4'), 'gzip'); // ; の前後の空白
});

test('q=0 は「いらない」', () => {
  assert.equal(n('gzip;q=0'), 'identity');
  assert.equal(n('br;q=0, gzip'), 'gzip');
  assert.equal(n('br;q=0.000, gzip;q=0'), 'identity');
});

test('* は、書いていないもの全部', () => {
  assert.equal(n('*'), 'br');
  assert.equal(n('br;q=0, *'), 'gzip');
  assert.equal(n('*;q=0.5, gzip'), 'gzip');
});

test('identity も断られたら null（406 にしてよい）', () => {
  assert.equal(n('*;q=0'), null);
  assert.equal(n('identity;q=0'), null); // 書いていない br・gzip も、受け付けてもらえない
  assert.equal(n('*;q=0, identity'), 'identity');
  assert.equal(n('deflate, identity;q=0'), null);
});

test('q の形が正しくない項目は無視する', () => {
  assert.equal(n('gzip;q=1.5'), 'identity');
  assert.equal(n('gzip;q=abc, br;q=0.1'), 'br');
  assert.equal(n('gzip;q=0.12345'), 'identity');
  assert.equal(n('gzip;q='), 'identity');
});

test('サーバが持っていなければ、頼まれても選ばない', () => {
  assert.equal(n('br', ['gzip']), 'identity');
  assert.equal(n('br, gzip', []), 'identity');
});
