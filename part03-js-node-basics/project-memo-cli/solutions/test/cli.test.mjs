// memo コマンドを子プロセスとして起動して、外から確かめるテスト（第16章 10節）
// 使い方: node --test test/cli.test.mjs
//         MEMO_BIN=~/dev/memo-cli/bin/memo.mjs node --test test/cli.test.mjs   （自分で作ったものを確かめる）
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BIN = path.resolve(import.meta.dirname, process.env.MEMO_BIN ?? '../bin/memo.mjs');
const ESC = '\x1b';

let root, home, memoDir;
beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'memo-cli-')));
  home = path.join(root, 'home');
  memoDir = path.join(home, 'memos');
  await fs.mkdir(home);
  await fs.copyFile(path.join(import.meta.dirname, 'fake-editor.mjs'), path.join(root, 'fake-editor.mjs'));
});
afterEach(() => fs.rm(root, { recursive: true, force: true }));

// 自分の Mac の設定（~/.config/memo、EDITOR、NO_COLOR など）に影響されないよう、環境変数は必要なものだけ渡す
function memo(args, { input = '', env = {}, cwd = home } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BIN, ...args], {
      cwd,
      env: { PATH: process.env.PATH, HOME: home, TZ: 'Asia/Tokyo', EDITOR: `${process.execPath} ${path.join(root, 'fake-editor.mjs')}`, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (s) => (stdout += s));
    child.stderr.setEncoding('utf8').on('data', (s) => (stderr += s));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

// メモを作って id を返す
async function newMemo(title, { tags = [], body = '本文' } = {}) {
  const r = await memo(['new', ...title.split(' '), ...tags.flatMap((t) => ['-t', t]), '-m', body]);
  assert.equal(r.code, 0, r.stderr);
  return r.stdout.trim();
}
const readMemo = async (id) => fs.readFile(path.join(memoDir, `${id}.md`), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('--help は stdout と 0。コマンドが無ければ stderr と 2。--version', async () => {
  const help = await memo(['--help']);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /new/);
  assert.match(help.stdout, /search/);
  const none = await memo([]);
  assert.equal(none.code, 2);
  assert.equal(none.stdout, '');
  assert.match(none.stderr, /使い方/);
  const ver = await memo(['--version']);
  assert.equal(ver.code, 0);
  assert.match(ver.stdout, /^\d+\.\d+\.\d+\n$/);
  const sub = await memo(['list', '--help']);
  assert.equal(sub.code, 0);
  assert.match(sub.stdout, /memo list/);
});

test('new: stdout には id だけ。~/memos に front matter 付きの Markdown ができる', async () => {
  const r = await memo(['new', '牛乳を', '買う', '-t', '買い物', '-t', '急ぎ', '-m', '低脂肪']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^\d{8}-\d{6}\n$/);
  const text = await readMemo(r.stdout.trim());
  assert.match(text, /^---\n/);
  assert.match(text, /title: "?牛乳を 買う"?\n/);
  assert.match(text, /買い物/);
  assert.match(text, /急ぎ/);
  assert.match(text, /created: \d{4}-\d{2}-\d{2}T/);
  assert.match(text, /\n---\n\n?低脂肪\n$/);
});

test('new: 本文を標準入力から読む', async () => {
  const r = await memo(['new', '設計'], { input: '# 設計\n1行目\n' });
  assert.equal(r.code, 0, r.stderr);
  assert.match(await readMemo(r.stdout.trim()), /# 設計\n1行目\n$/);
});

test('list: 新しく更新した順。タグで絞る、件数、--json', async () => {
  const a = await newMemo('古いメモ', { tags: ['仕事'] });
  await sleep(1100); // id は秒の単位なので、1秒あける
  const b = await newMemo('新しいメモ', { tags: ['家'] });
  const all = await memo(['list']);
  assert.equal(all.code, 0);
  const lines = all.stdout.trimEnd().split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], new RegExp(`^${b}\\s.*新しいメモ.*#家`));
  assert.match(lines[1], new RegExp(`^${a}\\s.*古いメモ.*#仕事`));
  assert.match(lines[0], /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  assert.equal((await memo(['list', '-t', '仕事'])).stdout.trimEnd().split('\n').length, 1);
  assert.equal((await memo(['list', '-n', '1'])).stdout.trimEnd().split('\n').length, 1);
  const json = JSON.parse((await memo(['list', '--json'])).stdout);
  assert.deepEqual(json.map((m) => [m.id, m.title, m.tags]), [[b, '新しいメモ', ['家']], [a, '古いメモ', ['仕事']]]);
});

test('list: メモが無くても 0。パイプには色を付けない', async () => {
  const empty = await memo(['list']);
  assert.equal(empty.code, 0);
  assert.equal(empty.stdout, '');
  await newMemo('色', { tags: ['t'] });
  const r = await memo(['list']);
  assert.ok(!r.stdout.includes(ESC), '色の制御文字が入っています');
});

test('show: そのまま出す。区別できれば最初の何文字かでよい', async () => {
  const id = await newMemo('見る');
  const r = await memo(['show', id.slice(0, 11)]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, await readMemo(id));
});

test('show: 見つからない・区別できない・フォルダの外は 1', async () => {
  const id = await newMemo('a');
  await newMemo('b'); // 同じ秒なら id-2、違う秒でも先頭の日付は同じ
  await fs.writeFile(path.join(home, 'secret.md'), '外のファイル');
  for (const bad of ['19990101', id.slice(0, 8), '../secret']) {
    const r = await memo(['show', bad]);
    assert.equal(r.code, 1, bad);
    assert.equal(r.stdout, '', bad);
    assert.notEqual(r.stderr, '', bad);
  }
});

test('search: タイトル・タグ・本文から、大文字と小文字を区別せずに探す。見つからなければ 1', async () => {
  const a = await newMemo('Node の勉強', { body: 'parseArgs を使う\nほかの行' });
  await newMemo('買い物', { tags: ['家'], body: '牛乳' });
  const r = await memo(['search', 'PARSEARGS']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, new RegExp(`^${a}`));
  assert.match(r.stdout, /parseArgs を使う/);
  assert.doesNotMatch(r.stdout, /ほかの行|買い物/);
  assert.match((await memo(['search', '家'])).stdout, /買い物/);
  const none = await memo(['search', 'zzz']);
  assert.equal(none.code, 1);
  assert.equal(none.stdout, '');
});

test('search: 正規表現ではなく、ただの文字列として探す', async () => {
  await newMemo('a', { body: 'abc' });
  assert.equal((await memo(['search', '.*'])).code, 1);
  assert.equal((await memo(['search', '(a+)+$'])).code, 1);
});

test('tag: 付ける・外す・見る', async () => {
  const id = await newMemo('t', { tags: ['a'] });
  const r = await memo(['tag', id, '--add', 'b', '--add', 'c', '--remove', 'a']);
  assert.equal(r.code, 0, r.stderr);
  assert.equal((await memo(['tag', id])).stdout, 'b\nc\n');
  const bad = await memo(['tag', id, '--add', 'x y']);
  assert.equal(bad.code, 2);
});

test('rm: 端末でなければ --yes が必要（2）。--yes なら .trash に移す', async () => {
  const id = await newMemo('消す');
  const refused = await memo(['rm', id]);
  assert.equal(refused.code, 2);
  assert.match(refused.stderr, /--yes/);
  await fs.access(path.join(memoDir, `${id}.md`)); // まだある
  const r = await memo(['rm', id, '--yes']);
  assert.equal(r.code, 0, r.stderr);
  await assert.rejects(fs.access(path.join(memoDir, `${id}.md`)));
  await fs.access(path.join(memoDir, '.trash', `${id}.md`));
  assert.equal((await memo(['list'])).stdout, '');
});

test('edit: エディタで変えたら updated が進む。エディタが失敗したら 1 で、変えない', async () => {
  const id = await newMemo('編集');
  const before = await readMemo(id);
  await sleep(20);
  const r = await memo(['edit', id]);
  assert.equal(r.code, 0, r.stderr);
  const after = await readMemo(id);
  assert.match(after, /エディタで足した行\n$/);
  const updated = (s) => /updated: (\S+)/.exec(s)[1];
  assert.notEqual(updated(after), updated(before));
  const failed = await memo(['edit', id], { env: { FAKE_EDITOR_MODE: 'fail' } });
  assert.equal(failed.code, 1);
  assert.equal(await readMemo(id), after);
});

test('edit: エディタは MEMO_EDITOR > VISUAL > EDITOR。見つからなければ 1', async () => {
  const id = await newMemo('e');
  const r = await memo(['edit', id], { env: { MEMO_EDITOR: 'no-such-editor-xyz' } });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /no-such-editor-xyz/);
});

test('設定: 設定ファイル（XDG）< MEMO_DIR < --dir', async () => {
  const xdg = path.join(root, 'xdg');
  await fs.mkdir(path.join(xdg, 'memo'), { recursive: true });
  await fs.writeFile(path.join(xdg, 'memo', 'config.json'), JSON.stringify({ dir: path.join(root, 'from-file') }));
  const env = { XDG_CONFIG_HOME: xdg };
  await memo(['new', 'f', '-m', 'x'], { env });
  await fs.access(path.join(root, 'from-file'));
  await memo(['new', 'e', '-m', 'x'], { env: { ...env, MEMO_DIR: path.join(root, 'from-env') } });
  await fs.access(path.join(root, 'from-env'));
  await memo(['new', 'a', '-m', 'x', '--dir', 'from-args'], { env: { ...env, MEMO_DIR: path.join(root, 'from-env') } });
  await fs.access(path.join(home, 'from-args')); // 相対パスは今いるフォルダ（cwd）から
  const shown = await memo(['config', '--dir', 'from-args'], { env });
  assert.match(shown.stdout, /args/);
});

test('壊れた設定ファイルは 2。どのファイルかを stderr に出す', async () => {
  await fs.mkdir(path.join(home, '.config', 'memo'), { recursive: true });
  await fs.writeFile(path.join(home, '.config', 'memo', 'config.json'), '{ "dir": ');
  const r = await memo(['list']);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /config\.json/);
});

test('使い方の間違いは 2 で、stdout は空', async () => {
  for (const args of [['frob'], ['list', '--bogus'], ['list', '-n', '0'], ['new'], ['show'], ['new', 'x', '-t', 'a,b']]) {
    const r = await memo(args);
    assert.equal(r.code, 2, args.join(' '));
    assert.equal(r.stdout, '', args.join(' '));
  }
});
