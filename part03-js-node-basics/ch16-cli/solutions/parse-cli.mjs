// 練習問題2 解答例: サブコマンドのある todo CLI の引数を解析する
import { parseArgs } from 'node:util';

export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
    this.exitCode = 2; // 使い方の間違い
  }
}

// サブコマンドごとに、使えるオプションを決める
const COMMANDS = {
  add: { tag: { type: 'string', short: 't', multiple: true }, due: { type: 'string' } },
  list: { tag: { type: 'string', short: 't' }, all: { type: 'boolean', short: 'a' }, limit: { type: 'string', short: 'n' } },
  done: {},
};

// 実在する日付か（2026-02-30 は NG）
function isValidDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function positiveInt(s, name) {
  // Number('') は 0、Number('1e2') は 100、Number(' 3') は 3。数字だけかを先に確かめる
  if (!/^[1-9]\d*$/.test(s)) throw new UsageError(`${name} は1以上の整数にしてください: ${s}`);
  return Number(s);
}

export function parseCli(argv) {
  // -- より後ろは、オプションに見えても値として扱う
  const dashdash = argv.indexOf('--');
  const before = dashdash === -1 ? argv : argv.slice(0, dashdash);
  const first = argv[0];
  const command = first !== undefined && !first.startsWith('-') ? first : null;

  if (before.includes('--help') || before.includes('-h')) {
    return { command: 'help', topic: command && Object.hasOwn(COMMANDS, command) ? command : null };
  }
  if (command === null) {
    if (first === '--version' || first === '-V') return { command: 'version' };
    if (first === undefined) throw new UsageError('コマンドを指定してください（add, list, done）');
    if (first === '--') throw new UsageError('コマンドを指定してください（add, list, done）');
    throw new UsageError(`知らないオプションです: ${first}`);
  }
  if (!Object.hasOwn(COMMANDS, command)) {
    throw new UsageError(`知らないコマンドです: ${command}（add, list, done）`);
  }

  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({ args: argv.slice(1), options: COMMANDS[command], allowPositionals: true, strict: true }));
  } catch (err) {
    // parseArgs のエラー（知らないオプション、値が無い など）を、使い方のエラーに変える
    throw new UsageError(`${command}: ${err.message}`);
  }

  switch (command) {
    case 'add': {
      const title = positionals.join(' ').trim();
      if (title === '') throw new UsageError('add: タイトルを指定してください');
      if (values.due !== undefined && !isValidDate(values.due)) {
        throw new UsageError(`add: --due は YYYY-MM-DD の実在する日付にしてください: ${values.due}`);
      }
      return { command, title, tags: values.tag ?? [], due: values.due ?? null };
    }
    case 'list': {
      if (positionals.length > 0) throw new UsageError(`list: 余分な引数があります: ${positionals.join(' ')}`);
      return {
        command,
        tag: values.tag ?? null,
        all: values.all ?? false,
        limit: values.limit === undefined ? 20 : positiveInt(values.limit, 'list: --limit'),
      };
    }
    case 'done': {
      if (positionals.length !== 1) throw new UsageError('done: 番号を1つ指定してください');
      return { command, id: positiveInt(positionals[0], 'done: 番号') };
    }
  }
}
