// memo コマンドの本体: 引数を解析して、コマンドを実行し、終了コードを返す
import fs from 'node:fs/promises';
import { parseArgs, styleText } from 'node:util';
import pkg from '../package.json' with { type: 'json' };
import { loadConfig } from './config.mjs';
import { confirm } from './confirm.mjs';
import { openEditor } from './editor.mjs';
import { isValidTag } from './front-matter.mjs';
import { MemoStore } from './store.mjs';

export class UsageError extends Error {
  constructor(message, command = null) {
    super(message);
    this.name = 'UsageError';
    this.exitCode = 2;
    this.command = command;
  }
}

// ---- 引数 ----------------------------------------------------------------

const GLOBAL = {
  dir: { type: 'string' },
  config: { type: 'string' },
  'no-color': { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
};

const COMMANDS = {
  new: {
    usage: 'memo new <タイトル...> [-t タグ]... [-m 本文] [--no-edit]',
    summary: 'メモを作る',
    detail: [
      '本文は -m で渡すか、標準入力から流し込む（echo 本文 | memo new タイトル）。',
      'どちらも無く、端末で動かしているときは、エディタを開く（--no-edit で開かない）。',
      '作ったメモの id を標準出力に出す。',
    ],
    options: { tag: { type: 'string', short: 't', multiple: true }, message: { type: 'string', short: 'm' }, 'no-edit': { type: 'boolean' } },
  },
  list: {
    usage: 'memo list [-t タグ] [-n 件数] [--json]',
    summary: 'メモの一覧（新しく更新した順）',
    detail: ['-t でタグを絞り込む。-n で件数（既定は全部）。'],
    options: { tag: { type: 'string', short: 't' }, limit: { type: 'string', short: 'n' }, json: { type: 'boolean' } },
  },
  show: {
    usage: 'memo show <id>',
    summary: 'メモをそのまま表示する',
    detail: ['id は、ほかのメモと区別できれば、最初の何文字かだけでもよい。'],
    options: {},
  },
  edit: {
    usage: 'memo edit <id>',
    summary: 'メモをエディタで開く',
    detail: ['エディタは --editor、MEMO_EDITOR、VISUAL、EDITOR、設定ファイルの editor の順に決まる。'],
    options: { editor: { type: 'string' } },
  },
  search: {
    usage: 'memo search <文字列> [--json]',
    summary: 'タイトル・タグ・本文から探す（大文字と小文字は区別しない）',
    detail: ['正規表現ではなく、ただの文字列として探す。見つからなければ終了コード 1。'],
    options: { json: { type: 'boolean' } },
  },
  tag: {
    usage: 'memo tag <id> [--add タグ]... [--remove タグ]...',
    summary: 'タグを見る・付ける・外す',
    detail: ['--add も --remove も無ければ、今のタグを表示する。'],
    options: { add: { type: 'string', short: 'a', multiple: true }, remove: { type: 'string', short: 'r', multiple: true } },
  },
  rm: {
    usage: 'memo rm <id>... [-y]',
    summary: 'メモをゴミ箱（<メモのフォルダ>/.trash）に移す',
    detail: ['端末では確かめてから移す。端末でないときは -y（--yes）が必要。'],
    options: { yes: { type: 'boolean', short: 'y' } },
  },
  config: {
    usage: 'memo config',
    summary: '今の設定と、それぞれがどこから来たかを表示する',
    detail: [],
    options: {},
  },
};

function mainHelp() {
  const width = Math.max(...Object.keys(COMMANDS).map((c) => c.length));
  return [
    `memo ${pkg.version} — メモを Markdown のファイルで管理する`,
    '',
    '使い方: memo <コマンド> [引数...] [オプション...]',
    '',
    'コマンド:',
    ...Object.entries(COMMANDS).map(([name, c]) => `  ${name.padEnd(width)}  ${c.summary}`),
    '',
    'どのコマンドでも使えるオプション:',
    '  --dir <フォルダ>     メモを置くフォルダ（既定: ~/memos。MEMO_DIR でも決められる）',
    '  --config <ファイル>  設定ファイル（既定: ~/.config/memo/config.json）',
    '  --no-color           色を付けない（NO_COLOR でも同じ）',
    '  -h, --help           使い方を表示する',
    '  -V, --version        版を表示する',
    '',
    '終了コード: 0 成功 / 1 失敗（見つからない など） / 2 使い方や設定の間違い / 130 中止',
    '詳しくは memo <コマンド> --help',
  ].join('\n');
}

function commandHelp(name) {
  const c = COMMANDS[name];
  return [`使い方: ${c.usage}`, '', c.summary, ...(c.detail.length ? ['', ...c.detail] : [])].join('\n');
}

export function parseCli(argv) {
  const dashdash = argv.indexOf('--');
  const before = dashdash === -1 ? argv : argv.slice(0, dashdash);
  const first = argv[0];
  const command = first !== undefined && !first.startsWith('-') && Object.hasOwn(COMMANDS, first) ? first : null;

  if (before.includes('--help') || before.includes('-h')) return { command: 'help', topic: command };
  if (first === '--version' || first === '-V') return { command: 'version' };
  if (first === undefined) return { command: 'help', topic: null, noCommand: true };
  if (command === null) {
    throw new UsageError(first.startsWith('-') ? `コマンドの前にオプションは書けません: ${first}` : `知らないコマンドです: ${first}`);
  }

  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv.slice(1),
      options: { ...GLOBAL, ...COMMANDS[command].options },
      allowPositionals: true,
    }));
  } catch (err) {
    throw new UsageError(err.message, command);
  }
  const flags = { dir: values.dir, config: values.config, color: values['no-color'] ? false : undefined, editor: values.editor };
  const need = (cond, msg) => {
    if (!cond) throw new UsageError(msg, command);
  };
  const tags = (list = []) => {
    for (const t of list) need(isValidTag(t), `タグに使えない文字があります（空白 , [ ] " ' # は使えません）: ${JSON.stringify(t)}`);
    return list;
  };

  switch (command) {
    case 'new': {
      const title = positionals.join(' ').trim();
      need(title !== '', 'タイトルを指定してください');
      return { command, flags, title, tags: tags(values.tag), message: values.message, noEdit: values['no-edit'] ?? false };
    }
    case 'list': {
      need(positionals.length === 0, `余分な引数があります: ${positionals.join(' ')}`);
      if (values.limit !== undefined) need(/^[1-9]\d*$/.test(values.limit), `-n は1以上の整数にしてください: ${values.limit}`);
      if (values.tag !== undefined) tags([values.tag]);
      return { command, flags, tag: values.tag ?? null, limit: values.limit ? Number(values.limit) : Infinity, json: values.json ?? false };
    }
    case 'show':
    case 'edit':
      need(positionals.length === 1, 'id を1つ指定してください');
      return { command, flags, id: positionals[0] };
    case 'search': {
      const query = positionals.join(' ');
      need(query.trim() !== '', '探す文字列を指定してください');
      return { command, flags, query, json: values.json ?? false };
    }
    case 'tag':
      need(positionals.length === 1, 'id を1つ指定してください');
      return { command, flags, id: positionals[0], add: tags(values.add), remove: values.remove ?? [] };
    case 'rm':
      need(positionals.length >= 1, '移すメモの id を指定してください');
      return { command, flags, ids: positionals, yes: values.yes ?? false };
    case 'config':
      need(positionals.length === 0, `余分な引数があります: ${positionals.join(' ')}`);
      return { command, flags };
  }
}

// ---- 出力 ----------------------------------------------------------------

const out = (s = '') => process.stdout.write(`${s}\n`);
const info = (s) => process.stderr.write(`${s}\n`);
const warn = (s) => process.stderr.write(`memo: 警告: ${s}\n`);

const pad = (n) => String(n).padStart(2, '0');
function localTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '????-??-?? ??:??';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function makePainter(enabled) {
  // enabled でも、出力先が端末でなければ styleText が色を付けない（NO_COLOR・FORCE_COLOR も見る）
  return (format, s) => (enabled ? styleText(format, s, { stream: process.stdout }) : s);
}

function memoLine(memo, paint, idWidth = 0) {
  const tags = memo.meta.tags.map((t) => paint('cyan', `#${t}`)).join(' ');
  return [paint('yellow', memo.id.padEnd(idWidth)), paint('dim', localTime(memo.meta.updated)), memo.meta.title, ...(tags ? [tags] : [])].join('  ');
}

const toJson = (memo, extra = {}) => ({
  id: memo.id,
  title: memo.meta.title,
  tags: memo.meta.tags,
  created: memo.meta.created,
  updated: memo.meta.updated,
  path: memo.path,
  ...extra,
});

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// エディタで開き、中身が変わっていれば updated を進める
async function editFile(store, id, editor) {
  const file = store.pathOf(id);
  const before = await fs.readFile(file, 'utf8');
  await openEditor(editor, file);
  const after = await fs.readFile(file, 'utf8');
  if (after === before) return false;
  try {
    // エディタで書き換えたタイトル・タグ・本文はそのまま使い、updated だけを今の時刻にして書き直す
    await store.update(id, (m) => m);
  } catch (err) {
    if (err.name !== 'FrontMatterError') throw err;
    warn(`${id}.md の front matter に問題があります（${err.message}）。ファイルは書いたままにして、更新日時は変えていません`);
  }
  return true;
}

// ---- コマンド --------------------------------------------------------------

const run = {
  async new(args, { store, config }) {
    let body = args.message ?? '';
    const useStdin = args.message === undefined && !process.stdin.isTTY;
    if (useStdin) body = await readStdin();
    const memo = await store.create({ title: args.title, tags: args.tags, body });
    info(`作成しました: ${memo.path}`);
    out(memo.id);
    if (args.message === undefined && !useStdin && !args.noEdit) {
      await editFile(store, memo.id, config.editor);
    }
    return 0;
  },

  async list(args, { store, paint }) {
    let memos = await store.list();
    if (args.tag) memos = memos.filter((m) => m.meta.tags.includes(args.tag));
    memos = memos.slice(0, args.limit);
    if (args.json) {
      out(JSON.stringify(memos.map((m) => toJson(m)), null, 2));
    } else if (memos.length === 0) {
      info(args.tag ? `タグ #${args.tag} のメモはありません` : `メモはありません（${store.dir}）`);
    } else {
      const w = Math.max(...memos.map((m) => m.id.length));
      for (const m of memos) out(memoLine(m, paint, w));
    }
    return 0;
  },

  async show(args, { store }) {
    const id = await store.resolve(args.id);
    // 壊れたファイルでも見られるように、解析せずにそのまま出す
    process.stdout.write(await fs.readFile(store.pathOf(id), 'utf8'));
    return 0;
  },

  async edit(args, { store, config }) {
    const id = await store.resolve(args.id);
    const changed = await editFile(store, id, config.editor);
    info(changed ? `更新しました: ${id}` : '変更はありませんでした');
    return 0;
  },

  async search(args, { store, paint }) {
    const q = args.query.normalize('NFC').toLowerCase();
    const has = (s) => s.normalize('NFC').toLowerCase().includes(q);
    const results = [];
    for (const memo of await store.list()) {
      const lines = memo.body
        .split('\n')
        .map((text, i) => ({ line: i + 1, text }))
        .filter(({ text }) => has(text));
      if (has(memo.meta.title) || memo.meta.tags.some(has) || lines.length > 0) results.push({ memo, lines });
    }
    if (args.json) {
      out(JSON.stringify(results.map(({ memo, lines }) => toJson(memo, { matches: lines })), null, 2));
    } else {
      const w = Math.max(0, ...results.map(({ memo }) => memo.id.length));
      for (const { memo, lines } of results) {
        out(memoLine(memo, paint, w));
        for (const { line, text } of lines) out(`    ${paint('dim', `${line}:`)} ${text}`);
      }
    }
    if (results.length === 0) info(`見つかりませんでした: ${args.query}`);
    return results.length > 0 ? 0 : 1; // grep と同じく、見つからなければ 1
  },

  async tag(args, { store }) {
    const id = await store.resolve(args.id);
    let memo = await store.read(id);
    if (args.add.length > 0 || args.remove.length > 0) {
      const missing = args.remove.filter((t) => !memo.meta.tags.includes(t));
      for (const t of missing) warn(`タグ #${t} は付いていません`);
      memo = await store.update(id, (m) => ({
        meta: { ...m.meta, tags: [...m.meta.tags.filter((t) => !args.remove.includes(t)), ...args.add] },
      }));
    }
    for (const t of memo.meta.tags) out(t);
    return 0;
  },

  async rm(args, { store }) {
    const ids = [];
    for (const input of args.ids) {
      const id = await store.resolve(input);
      if (!ids.includes(id)) ids.push(id);
    }
    const memos = await Promise.all(ids.map((id) => store.read(id).catch(() => ({ id, meta: { title: '（読めないメモ）' } }))));
    if (!args.yes) for (const m of memos) info(`  ${m.id}  ${m.meta.title}`);
    const ok = await confirm(`${memos.length} 件のメモをゴミ箱に移します。よろしいですか？`, { assumeYes: args.yes });
    if (!ok) {
      info('やめました');
      return 0;
    }
    for (const id of ids) info(`ゴミ箱に移しました: ${await store.remove(id)}`);
    return 0;
  },

  async config(_args, { loaded }) {
    const { config, sources, configFile, fileLoaded } = loaded;
    out(`設定ファイル: ${configFile}${fileLoaded ? '' : '（無い）'}`);
    for (const key of Object.keys(config)) out(`${key} = ${config[key]}  (${sources[key]})`);
    return 0;
  },
};

// ---- 入口 ----------------------------------------------------------------

export async function main(argv) {
  // | head などで読む側が先に終わったら、静かに終わる（第16章 7節）
  process.stdout.on('error', (err) => {
    if (err.code === 'EPIPE') process.exit(0);
    throw err;
  });

  let args;
  try {
    args = parseCli(argv);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    info(`memo: ${err.message}`);
    info(err.command ? `使い方: ${COMMANDS[err.command].usage}` : '使い方: memo <コマンド> ...（memo --help）');
    return 2;
  }
  if (args.command === 'version') {
    out(pkg.version);
    return 0;
  }
  if (args.command === 'help') {
    if (args.noCommand) {
      info(mainHelp()); // コマンドが無いのは使い方の間違い。stderr に出して 2
      return 2;
    }
    out(args.topic ? commandHelp(args.topic) : mainHelp());
    return 0;
  }

  try {
    const loaded = loadConfig({ flags: args.flags });
    for (const w of loaded.warnings) warn(w);
    const store = new MemoStore(loaded.config.dir);
    const code = await run[args.command](args, { store, config: loaded.config, loaded, paint: makePainter(loaded.config.color) });
    for (const w of store.warnings) warn(w);
    return code;
  } catch (err) {
    if (typeof err.exitCode === 'number') {
      info(`memo: ${err.message}`);
      return err.exitCode;
    }
    info(`memo: 予期しないエラーです: ${err.message}`);
    if (process.env.MEMO_DEBUG) info(err.stack);
    else info('（MEMO_DEBUG=1 を付けて実行すると、詳しい情報を表示します）');
    return 1;
  }
}
