// メモのファイル（先頭に front matter の付いた Markdown）を読む・書く
//
// ---
// title: "牛乳を買う"
// tags: ["買い物", "急ぎ"]
// created: 2026-11-04T06:30:12.000Z
// updated: 2026-11-04T06:30:12.000Z
// ---
//
// 本文
//
// front matter は YAML の書き方の一部だけを扱う。書くときは、値を JSON の形（"..." と [...]）で書く。
// JSON の文字列と配列は YAML としても正しいので、ほかのツール（Obsidian など）でも読める。

export class FrontMatterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FrontMatterError';
  }
}

// タグに使えない文字: 空白、, [ ] " ' #
const TAG_RE = /^[^\s,[\]"'#]+$/u;
export function isValidTag(tag) {
  return typeof tag === 'string' && TAG_RE.test(tag);
}

const KNOWN = new Set(['title', 'tags', 'created', 'updated']);

function unquote(value) {
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replaceAll("''", "'");
  return value;
}

function parseTagList(value) {
  if (value === '') return [];
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) return arr.map(String);
    } catch {
      // [a, b] のように引用符の無い書き方。下で分ける
    }
    return value
      .slice(1, -1)
      .split(',')
      .map((s) => unquote(s.trim()))
      .filter(Boolean);
  }
  return value.split(',').map((s) => unquote(s.trim())).filter(Boolean);
}

/**
 * ファイルの中身を { meta, body, extra, hasFrontMatter } にする。
 * extra は、知らない行（自分で書き足した項目など）。書き戻すときにそのまま残す。
 */
export function parseMemo(text) {
  const src = text.replace(/^﻿/, '').replaceAll('\r\n', '\n');
  const meta = { title: '', tags: [], created: null, updated: null };
  if (!src.startsWith('---\n')) return { meta, body: src, extra: [], hasFrontMatter: false };

  const end = src.indexOf('\n---\n', 3);
  const endAtEof = src.endsWith('\n---') ? src.length - 4 : -1;
  const close = end !== -1 ? end : endAtEof;
  if (close === -1) throw new FrontMatterError('front matter の終わり（---）が見つかりません');

  const lines = close === 3 ? [] : src.slice(4, close).split('\n');
  let body = src.slice(close + 5);
  if (body.startsWith('\n')) body = body.slice(1); // front matter の後の空行を1つだけ取る

  const extra = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^([A-Za-z_][\w-]*):(?:\s+(.*)|\s*)$/.exec(line);
    if (!m || !KNOWN.has(m[1])) {
      extra.push(line);
      continue;
    }
    const [, key, raw = ''] = m;
    const value = raw.trim();
    if (key === 'tags') {
      if (value === '') {
        // ブロックの書き方
        // tags:
        //   - 買い物
        const items = [];
        while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) items.push(unquote(lines[++i].replace(/^\s+-\s+/, '').trim()));
        meta.tags = items;
      } else {
        meta.tags = parseTagList(value);
      }
    } else {
      meta[key] = unquote(value);
    }
  }
  return { meta, body, extra, hasFrontMatter: true };
}

export function serializeMemo({ meta, body = '', extra = [] }) {
  if (/[\r\n]/.test(meta.title)) throw new FrontMatterError('タイトルに改行は使えません');
  for (const t of meta.tags) if (!isValidTag(t)) throw new FrontMatterError(`タグに使えない文字があります: ${JSON.stringify(t)}`);
  const head = [
    '---',
    `title: ${JSON.stringify(meta.title)}`,
    `tags: ${JSON.stringify(meta.tags)}`,
    `created: ${meta.created}`,
    `updated: ${meta.updated}`,
    ...extra,
    '---',
  ].join('\n');
  const text = body === '' ? '' : body.endsWith('\n') ? body : `${body}\n`;
  return `${head}\n\n${text}`;
}
