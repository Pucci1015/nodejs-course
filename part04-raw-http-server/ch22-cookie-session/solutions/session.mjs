// 練習問題7の模範解答
import crypto from 'node:crypto';
import { parseCookies, serializeCookie, clearCookie } from './cookie.mjs';

// 修正: 連番や時刻ではなく、32 バイトの乱数。base64url で 43 文字
export const newSessionId = () => crypto.randomBytes(32).toString('base64url');

export class SessionStore {
  #map = new Map(); // id → { data, expires }
  #ttlMs;
  #now;

  constructor({ ttlMs = 30 * 60 * 1000, now = Date.now } = {}) {
    this.#ttlMs = ttlMs;
    this.#now = now;
  }

  get ttlMs() {
    return this.#ttlMs;
  }

  get size() {
    return this.#map.size;
  }

  create(data = {}) {
    const id = newSessionId();
    this.#map.set(id, { data, expires: this.#now() + this.#ttlMs });
    return id;
  }

  get(id) {
    const entry = this.#map.get(id);
    if (!entry) return null;
    if (entry.expires <= this.#now()) {
      this.#map.delete(id); // 追加: 切れていたら消して、無いことにする
      return null;
    }
    return entry.data;
  }

  set(id, data) {
    // 追加: 保存するたびに期限を延ばす（最後に使ってから ttlMs で切れる）
    this.#map.set(id, { data, expires: this.#now() + this.#ttlMs });
  }

  destroy(id) {
    this.#map.delete(id);
  }

  regenerate(oldId, data = {}) {
    this.destroy(oldId); // 追加: 古い ID は、もう使えないようにする
    return this.create(data);
  }

  prune() {
    let n = 0;
    for (const [id, entry] of this.#map) {
      if (entry.expires <= this.#now()) {
        this.#map.delete(id);
        n++;
      }
    }
    return n;
  }
}

/** handler を包んで、req.session・req.regenerateSession()・req.destroySession() を使えるようにする */
export function withSession(handler, store, { cookieName = 'sid', secure = false } = {}) {
  return (req, res) => {
    const cookieId = parseCookies(req.headers.cookie)[cookieName];
    const existing = cookieId ? store.get(cookieId) : null;
    let id = existing ? cookieId : null; // 修正: 知らない ID（切れた・作っていない）は使わない
    let destroyed = false;
    req.session = existing ?? {};

    req.regenerateSession = () => {
      if (id) store.destroy(id);
      id = null; // 新しい ID は、保存するときに作る
      req.session = {};
    };
    req.destroySession = () => {
      if (id) store.destroy(id);
      id = null;
      destroyed = true;
      req.session = {};
    };

    const writeHead = res.writeHead;
    res.writeHead = function (...args) {
      res.writeHead = writeHead; // 一度だけ
      const cookies = [];
      const empty = Object.keys(req.session).length === 0;
      if (empty && !id) {
        // 追加: 中身の無いセッションは作らない（来ただけの客ごとに保存しない）。ログアウトしたなら Cookie も消す
        if (destroyed && cookieId) cookies.push(clearCookie(cookieName, { secure }));
      } else {
        if (id) store.set(id, req.session);
        else id = store.create(req.session);
        cookies.push(serializeCookie(cookieName, id, { maxAge: Math.ceil(store.ttlMs / 1000), httpOnly: true, secure, sameSite: 'Lax' }));
        if (!this.hasHeader('Cache-Control')) this.setHeader('Cache-Control', 'no-store'); // 追加: 人ごとに違うページ
      }
      if (cookies.length) {
        const prev = this.getHeader('Set-Cookie');
        this.setHeader('Set-Cookie', [...(prev === undefined ? [] : [prev].flat()), ...cookies]);
      }
      return writeHead.apply(this, args);
    };
    return handler(req, res);
  };
}
