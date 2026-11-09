// 掲示板のデータを、1つの JSON ファイルに保存する（第6部でデータベースを学ぶと、ここを取り替えられる）
//
//   data/bbs.json
//   { "version": 1, "nextId": { "user": 2, "thread": 3, "post": 7 },
//     "users": [...], "threads": [...], "posts": [...] }
//
// 書き換えは、すべて「メモリの中身を変える → ファイル全体を書き直す」。
// 書き直しは1つずつ順に（前の書き込みが終わってから次）。途中で落ちても壊れないように writeFileAtomic で
import fs from 'node:fs/promises';
import path from 'node:path';
import { writeFileAtomic } from './lib/atomic.mjs';

const EMPTY = () => ({ version: 1, nextId: { user: 1, thread: 1, post: 1 }, users: [], threads: [], posts: [] });

export class Store {
  #file;
  #data;
  #now;
  #queue = Promise.resolve(); // 書き込みを1つずつ順に行うための鎖

  constructor(file, data, now) {
    this.#file = file;
    this.#data = data;
    this.#now = now;
  }

  /** ファイルを読んで Store を作る。ファイルが無ければ空で始める */
  static async open(dir, { now = () => new Date() } = {}) {
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, 'bbs.json');
    let data;
    try {
      data = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err; // 壊れたファイルは、黙って空にしない（データが消える）
      data = EMPTY();
    }
    if (data.version !== 1) throw new Error(`知らない形式のデータです: ${file}`);
    return new Store(file, data, now);
  }

  // 変更をファイルに書く。呼んだ側は await して、書けたことを確かめてから 303 を返す
  #save() {
    const json = `${JSON.stringify(this.#data, null, 2)}\n`; // 呼ばれた時点の中身を、文字にしておく
    const job = this.#queue.then(() => writeFileAtomic(this.#file, json));
    this.#queue = job.catch(() => {}); // 1回失敗しても、次の書き込みは続けられるように
    return job;
  }

  #id(kind) {
    return this.#data.nextId[kind]++;
  }

  #stamp() {
    return this.#now().toISOString();
  }

  // ---- ユーザー
  findUserByName(name) {
    return this.#data.users.find((u) => u.name === name) ?? null;
  }

  findUser(id) {
    return this.#data.users.find((u) => u.id === id) ?? null;
  }

  async addUser({ name, salt, hash }) {
    if (this.findUserByName(name)) return null; // 同じ名前は作らない（確かめと追加の間に await を挟まない）
    const user = { id: this.#id('user'), name, salt, hash, createdAt: this.#stamp() };
    this.#data.users.push(user);
    await this.#save();
    return user;
  }

  // ---- スレッドと投稿
  /** 新しく書き込まれた順のスレッドの一覧（投稿の数と、作った人の名前つき） */
  listThreads() {
    return this.#data.threads
      .map((t) => this.#threadSummary(t))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id);
  }

  #threadSummary(t) {
    return {
      ...t,
      author: this.findUser(t.userId)?.name ?? '（不明）',
      postCount: this.#data.posts.filter((p) => p.threadId === t.id).length,
    };
  }

  getThread(id) {
    const t = this.#data.threads.find((x) => x.id === id);
    if (!t) return null;
    const posts = this.#data.posts
      .filter((p) => p.threadId === id)
      .map((p) => ({ ...p, author: this.findUser(p.userId)?.name ?? '（不明）' }));
    return { ...this.#threadSummary(t), posts };
  }

  getPost(id) {
    return this.#data.posts.find((p) => p.id === id) ?? null;
  }

  /** スレッドと、その最初の投稿を作る */
  async addThread({ userId, title, body }) {
    const at = this.#stamp();
    const thread = { id: this.#id('thread'), title, userId, createdAt: at, updatedAt: at };
    const post = { id: this.#id('post'), threadId: thread.id, userId, body, createdAt: at, deleted: false };
    this.#data.threads.push(thread);
    this.#data.posts.push(post);
    await this.#save();
    return { thread, post };
  }

  async addPost({ threadId, userId, body }) {
    const thread = this.#data.threads.find((t) => t.id === threadId);
    if (!thread) return null;
    const at = this.#stamp();
    const post = { id: this.#id('post'), threadId, userId, body, createdAt: at, deleted: false };
    this.#data.posts.push(post);
    thread.updatedAt = at;
    await this.#save();
    return post;
  }

  /** 投稿を消す。本文は残さず、消したという印だけを残す（後の投稿の番号がずれないように） */
  async deletePost(id) {
    const post = this.getPost(id);
    if (!post || post.deleted) return post;
    post.deleted = true;
    post.body = '';
    await this.#save();
    return post;
  }
}
