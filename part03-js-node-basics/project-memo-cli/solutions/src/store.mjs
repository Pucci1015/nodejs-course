// メモを置くフォルダを扱う。1つのメモは <dir>/<id>.md の1つのファイル
import fs from 'node:fs/promises';
import path from 'node:path';
import { createFileExclusive, writeFileAtomic } from './atomic.mjs';
import { parseMemo, serializeMemo } from './front-matter.mjs';

export class MemoError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.name = 'MemoError';
    this.exitCode = exitCode;
  }
}

const pad = (n, w = 2) => String(n).padStart(w, '0');

// 新しいメモの id: ローカル時刻の YYYYMMDD-HHmmss
export function idFromDate(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export class MemoStore {
  /** @param {string} dir  @param {{ now?: () => Date }} [opts] */
  constructor(dir, { now = () => new Date() } = {}) {
    this.dir = dir;
    this.now = now;
    this.warnings = [];
  }

  pathOf(id) {
    return path.join(this.dir, `${id}.md`);
  }

  // フォルダの中の id（*.md。. で始まるものは除く）。フォルダが無ければ空
  async ids() {
    let entries;
    try {
      entries = await fs.readdir(this.dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.md') && !e.name.startsWith('.'))
      .map((e) => e.name.slice(0, -3))
      .sort();
  }

  async read(id) {
    const file = this.pathOf(id);
    const [text, stat] = await Promise.all([fs.readFile(file, 'utf8'), fs.stat(file)]);
    const parsed = parseMemo(text); // 壊れていれば FrontMatterError
    const meta = { ...parsed.meta };
    // front matter の無いファイルや、項目の足りないファイルも扱えるようにする
    if (!meta.title) meta.title = id;
    meta.updated ??= stat.mtime.toISOString();
    meta.created ??= meta.updated;
    return { id, path: file, meta, body: parsed.body, extra: parsed.extra, hasFrontMatter: parsed.hasFrontMatter, text };
  }

  // すべてのメモ。新しく更新した順。読めないメモは warnings に入れて飛ばす
  async list() {
    const memos = [];
    for (const id of await this.ids()) {
      try {
        memos.push(await this.read(id));
      } catch (err) {
        this.warnings.push(`${id}.md を読めませんでした: ${err.message}`);
      }
    }
    return memos.sort((a, b) => (a.meta.updated < b.meta.updated ? 1 : a.meta.updated > b.meta.updated ? -1 : a.id < b.id ? 1 : -1));
  }

  /**
   * 利用者が書いた id を、本当にある id にする。最初の何文字かだけでもよい（ほかと区別できれば）。
   * フォルダの一覧と照らし合わせるだけで、利用者の文字列をパスとしては使わない（../ などで外に出られない）
   */
  async resolve(input) {
    const want = String(input).normalize('NFC');
    // Mac のファイル名は NFD（濁点が別の文字）のことがあるので、NFC にそろえてから比べる
    const ids = await this.ids();
    const exact = ids.find((id) => id.normalize('NFC') === want);
    if (exact !== undefined) return exact;
    const hits = ids.filter((id) => id.normalize('NFC').startsWith(want));
    if (want !== '' && hits.length === 1) return hits[0];
    if (hits.length > 1 && want !== '') {
      const shown = hits.slice(0, 5).join(', ') + (hits.length > 5 ? ` ほか ${hits.length - 5} 件` : '');
      throw new MemoError(`"${input}" に当てはまるメモが ${hits.length} 件あります: ${shown}`);
    }
    throw new MemoError(`メモが見つかりません: ${input}`);
  }

  async create({ title, tags = [], body = '' }) {
    const now = this.now();
    const meta = { title, tags: [...new Set(tags)], created: now.toISOString(), updated: now.toISOString() };
    const data = serializeMemo({ meta, body });
    await fs.mkdir(this.dir, { recursive: true });
    const base = idFromDate(now);
    // 同じ秒に作ったら -2、-3 … を付ける。EEXIST で「もうある」と分かる
    for (let n = 1; n < 100; n++) {
      const id = n === 1 ? base : `${base}-${n}`;
      try {
        await createFileExclusive(this.pathOf(id), data);
        return this.read(id);
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
      }
    }
    throw new MemoError('新しいメモの名前を決められませんでした');
  }

  // updater(memo) が返した { meta, body } で書き直す。updated は今の時刻にする
  async update(id, updater) {
    const memo = await this.read(id);
    const next = await updater(structuredClone({ meta: memo.meta, body: memo.body }));
    const meta = { ...memo.meta, ...next.meta, updated: this.now().toISOString() };
    meta.tags = [...new Set(meta.tags)];
    await writeFileAtomic(memo.path, serializeMemo({ meta, body: next.body ?? memo.body, extra: memo.extra }));
    return this.read(id);
  }

  // 消すのではなく、<dir>/.trash/ に移す。間違えて消しても戻せる
  async remove(id) {
    const trash = path.join(this.dir, '.trash');
    await fs.mkdir(trash, { recursive: true });
    let dest = path.join(trash, `${id}.md`);
    try {
      await fs.access(dest);
      dest = path.join(trash, `${id}.${idFromDate(this.now())}.md`); // 同じ名前がもうあれば、時刻を付ける
    } catch {
      // 無ければそのまま
    }
    await fs.rename(this.pathOf(id), dest);
    return dest;
  }
}
