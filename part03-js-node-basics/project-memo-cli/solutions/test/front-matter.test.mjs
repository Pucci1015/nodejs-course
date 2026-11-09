// front matter の読み書きのテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FrontMatterError, isValidTag, parseMemo, serializeMemo } from '../src/front-matter.mjs';

const meta = { title: '牛乳を買う', tags: ['買い物', '急ぎ'], created: '2026-11-04T06:30:12.000Z', updated: '2026-11-04T07:00:00.000Z' };

test('書いて読むと元に戻る', () => {
  const text = serializeMemo({ meta, body: '本文\n2行目\n' });
  assert.equal(
    text,
    '---\ntitle: "牛乳を買う"\ntags: ["買い物","急ぎ"]\ncreated: 2026-11-04T06:30:12.000Z\nupdated: 2026-11-04T07:00:00.000Z\n---\n\n本文\n2行目\n',
  );
  assert.deepEqual(parseMemo(text), { meta, body: '本文\n2行目\n', extra: [], hasFrontMatter: true });
});

test('YAML で特別な意味を持つタイトルも、引用符で守られる', () => {
  for (const title of ['yes', 'null', '[x]', 'a: b', '"引用符"', '# 見出し', '- リスト']) {
    const back = parseMemo(serializeMemo({ meta: { ...meta, title }, body: '' }));
    assert.equal(back.meta.title, title);
  }
});

test('手で書いた front matter も読める（引用符なし、[a, b]、ブロックのリスト、CRLF）', () => {
  assert.deepEqual(parseMemo('---\ntitle: 手で書いた\ntags: [a, "b"]\n---\n本文').meta.tags, ['a', 'b']);
  assert.equal(parseMemo("---\ntitle: 'it''s'\n---\n").meta.title, "it's");
  assert.deepEqual(parseMemo('---\ntags:\n  - 買い物\n  - "急ぎ"\ntitle: x\n---\n').meta, { title: 'x', tags: ['買い物', '急ぎ'], created: null, updated: null });
  assert.equal(parseMemo('---\r\ntitle: win\r\n---\r\n\r\n本文\r\n').body, '本文\n');
});

test('知らない行は extra に入れ、書き戻すときに残す', () => {
  const parsed = parseMemo('---\ntitle: x\naliases: [y]\n# コメント\n---\n本文\n');
  assert.deepEqual(parsed.extra, ['aliases: [y]', '# コメント']);
  assert.match(serializeMemo({ ...parsed, meta: { ...meta, ...parsed.meta } }), /aliases: \[y\]\n# コメント\n---/);
});

test('front matter の無いファイルは、全部が本文', () => {
  assert.deepEqual(parseMemo('# ただの Markdown\n'), {
    meta: { title: '', tags: [], created: null, updated: null }, body: '# ただの Markdown\n', extra: [], hasFrontMatter: false,
  });
});

test('front matter が閉じていなければ FrontMatterError', () => {
  assert.throws(() => parseMemo('---\ntitle: x\n本文\n'), FrontMatterError);
});

test('本文中の --- は front matter の終わりではない', () => {
  const text = serializeMemo({ meta, body: 'a\n---\nb\n' });
  assert.equal(parseMemo(text).body, 'a\n---\nb\n');
});

test('タイトルの改行と、使えない文字のタグは書かない', () => {
  assert.throws(() => serializeMemo({ meta: { ...meta, title: 'a\nb' } }), FrontMatterError);
  assert.throws(() => serializeMemo({ meta: { ...meta, tags: ['a b'] } }), FrontMatterError);
  for (const t of ['買い物', 'node.js', 'c++', 'v2_0']) assert.ok(isValidTag(t), t);
  for (const t of ['', 'a b', 'a,b', '#a', '[a]', '"a"', 'a\tb']) assert.ok(!isValidTag(t), t);
});
