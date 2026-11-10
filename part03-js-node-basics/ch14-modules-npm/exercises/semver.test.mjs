// 練習問題8 用: semver.mjs のテスト
// 使い方: node --test semver.test.mjs
//   模範解答を試す: MODULE=../solutions/semver.mjs node --test semver.test.mjs
// 期待する値は、npm が使っている semver パッケージ（7.x）の結果と同じにしてあります。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './semver.mjs');
const { parse, compare, satisfies, maxSatisfying } = await import(pathToFileURL(modulePath).href);

test('parse: 正しいバージョンを分解する', () => {
  assert.deepEqual(parse('1.2.3'), { major: 1, minor: 2, patch: 3, prerelease: [] });
  assert.deepEqual(parse('v10.20.30'), { major: 10, minor: 20, patch: 30, prerelease: [] });
  assert.deepEqual(parse('1.0.0-beta.11'), { major: 1, minor: 0, patch: 0, prerelease: ['beta', 11] });
  assert.deepEqual(parse('1.0.0-rc.1+build.5'), { major: 1, minor: 0, patch: 0, prerelease: ['rc', 1] }, '+ の後ろ（ビルドメタデータ）は無視する');
});

test('parse: 正しくないものは null', () => {
  for (const s of ['1.2', '1.2.3.4', '01.2.3', '1.02.3', '1.2.3-01', 'a.b.c', '1.2.3-', '', null, 123]) {
    assert.equal(parse(s), null, JSON.stringify(s));
  }
});

test('compare: 数字は数として比べる（文字として比べない）', () => {
  assert.equal(compare('1.2.10', '1.2.9'), 1);
  assert.equal(compare('1.10.0', '1.9.0'), 1);
  assert.equal(compare('2.0.0', '10.0.0'), -1);
  assert.equal(compare('1.2.3', 'v1.2.3'), 0);
  assert.equal(compare('1.2.3+a', '1.2.3+b'), 0, 'ビルドメタデータは比べない');
});

test('compare: プレリリースの順番（semver.org の例のとおり）', () => {
  const ordered = [
    '1.0.0-alpha',
    '1.0.0-alpha.1',
    '1.0.0-alpha.beta',
    '1.0.0-beta',
    '1.0.0-beta.2',
    '1.0.0-beta.11',
    '1.0.0-rc.1',
    '1.0.0',
  ];
  const shuffled = [...ordered].reverse();
  [shuffled[1], shuffled[5]] = [shuffled[5], shuffled[1]];
  assert.deepEqual(shuffled.sort(compare), ordered);
});

test('compare: 正しくないバージョンには TypeError', () => {
  assert.throws(() => compare('1.2', '1.2.3'), TypeError);
});

const cases = {
  比較の演算子: [
    ['1.2.3', { '1.2.3': true, '1.2.4': false, '1.2.2': false }],
    ['>1.2.3', { '1.2.3': false, '1.2.4': true, '2.0.0': true }],
    ['>=1.2.3', { '1.2.2': false, '1.2.3': true, '9.9.9': true }],
    ['<1.2.3', { '1.2.2': true, '1.2.3': false, '0.0.1': true }],
    ['<=1.2.3', { '1.2.3': true, '1.2.4': false }],
    ['>= 1.2.3', { '1.2.3': true }],
  ],
  '^（キャレット）': [
    ['^1.2.3', { '1.2.3': true, '1.2.4': true, '1.9.9': true, '2.0.0': false, '1.2.2': false }],
    ['^0.2.3', { '0.2.3': true, '0.2.9': true, '0.3.0': false }],
    ['^0.0.3', { '0.0.3': true, '0.0.4': false }],
    ['^1.2', { '1.2.0': true, '1.9.0': true, '2.0.0': false, '1.1.9': false }],
    ['^0.x', { '0.0.1': true, '0.9.9': true, '1.0.0': false }],
    ['^0', { '0.5.0': true, '1.0.0': false }],
  ],
  '~（チルダ）': [
    ['~1.2.3', { '1.2.3': true, '1.2.9': true, '1.3.0': false }],
    ['~1.2', { '1.2.0': true, '1.2.9': true, '1.3.0': false }],
    ['~1', { '1.0.0': true, '1.9.9': true, '2.0.0': false }],
    ['~0.2.3', { '0.2.5': true, '0.3.0': false }],
  ],
  'x・*・省略': [
    ['1.x', { '1.0.0': true, '1.9.9': true, '2.0.0': false, '0.9.9': false }],
    ['1.2.*', { '1.2.0': true, '1.2.99': true, '1.3.0': false }],
    ['*', { '0.0.0': true, '99.0.0': true }],
    ['', { '1.0.0': true }],
    ['1', { '1.0.0': true, '1.5.0': true, '2.0.0': false }],
    ['>1', { '1.9.9': false, '2.0.0': true }],
    ['<=1.2', { '1.2.9': true, '1.3.0': false }],
    ['<1', { '0.9.9': true, '1.0.0': false }],
  ],
  ハイフン: [
    ['1.2.3 - 2.3.4', { '1.2.3': true, '2.3.4': true, '2.3.5': false, '1.2.2': false }],
    ['1.2 - 2.3', { '1.2.0': true, '2.3.9': true, '2.4.0': false }],
    ['1 - 2', { '1.0.0': true, '2.9.9': true, '3.0.0': false }],
  ],
  'AND と OR': [
    ['>=1.2.3 <1.3.0', { '1.2.3': true, '1.2.9': true, '1.3.0': false }],
    ['^1.2.3 || ^2', { '1.5.0': true, '2.5.0': true, '3.0.0': false }],
    ['<1.0.0 || >=2.0.0 <2.1.0', { '0.9.0': true, '1.5.0': false, '2.0.5': true, '2.1.0': false }],
    ['>2 <1', { '1.5.0': false, '3.0.0': false }],
  ],
  プレリリース: [
    ['^1.2.3', { '1.2.4-beta': false, '1.3.0-rc.1': false }],
    ['^1.2.3-beta.1', { '1.2.3-beta.1': true, '1.2.3-beta.2': true, '1.2.3-alpha': false, '1.2.3': true, '1.2.4': true, '1.2.4-beta': false }],
    ['>=1.0.0-alpha <1.0.0', { '1.0.0-alpha': true, '1.0.0-rc.1': true, '1.0.0': false }],
    ['*', { '1.0.0-beta': false }],
    ['<2.0.0', { '2.0.0-beta': false, '1.9.9': true }],
    ['>=2.0.0-0', { '2.0.0-0': true, '2.0.0-rc.1': true, '2.1.0-beta': false }],
  ],
};

for (const [group, list] of Object.entries(cases)) {
  test(`satisfies: ${group}`, () => {
    for (const [range, expected] of list) {
      for (const [version, want] of Object.entries(expected)) {
        assert.equal(satisfies(version, range), want, `satisfies(${JSON.stringify(version)}, ${JSON.stringify(range)})`);
      }
    }
  });
}

test('satisfies: 正しくないバージョンは false', () => {
  assert.equal(satisfies('1.2', '*'), false);
  assert.equal(satisfies('abc', '^1.0.0'), false);
});

test('maxSatisfying: 範囲を満たす一番新しいもの（npm install が選ぶもの）', () => {
  const versions = ['1.0.0', '1.2.3', '1.2.10', '1.10.0', '2.0.0-beta', '2.0.0', '0.9.0', '1.2.4-rc.1'];
  assert.equal(maxSatisfying(versions, '^1.2.3'), '1.10.0');
  assert.equal(maxSatisfying(versions, '~1.2'), '1.2.10');
  assert.equal(maxSatisfying(versions, '<2'), '1.10.0');
  assert.equal(maxSatisfying(versions, '*'), '2.0.0');
  assert.equal(maxSatisfying(versions, '^3'), null);
});
