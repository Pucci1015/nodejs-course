// 練習問題4: セッションの保存場所と、ハンドラを包む withSession
// テスト: node --test session.test.mjs
// 問題2の serializeCookie・clearCookie・parseCookies を使う（自分の解答か、../solutions/cookie.mjs）
import { parseCookies, serializeCookie } from '../samples/cookie-basic.mjs';

let counter = 0;
/** 推測できない ID。32 バイトの乱数を base64url にしたもの（43 文字） */
export const newSessionId = () => String(++counter); // ここを書く

/** セッションをメモリに置く。最後に保存してから ttlMs たったら切れる */
export class SessionStore {
  constructor({ ttlMs = 30 * 60 * 1000, now = Date.now } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.map = new Map();
  }

  get size() {
    return this.map.size;
  }

  /** 新しいセッションを作り、ID を返す */
  create(data = {}) {
    const id = newSessionId();
    this.map.set(id, data);
    return id;
  }

  /** 中身を返す。無い・切れているときは null（切れていたら消す） */
  get(id) {
    return this.map.get(id) ?? null; // ここを書く
  }

  /** 中身を保存し、期限を延ばす */
  set(id, data) {
    this.map.set(id, data);
  }

  destroy(id) {
    this.map.delete(id);
  }

  /** 古い ID を消して、新しい ID で作り直す */
  regenerate(oldId, data = {}) {
    return oldId; // ここを書く
  }

  /** 切れたものを全部消し、消した数を返す */
  prune() {
    return 0; // ここを書く
  }
}

/**
 * handler を包んで、req.session（中身のオブジェクト）・req.regenerateSession()・req.destroySession() を使えるようにする
 * 決まりは README の問題4
 */
export function withSession(handler, store, { cookieName = 'sid', secure = false } = {}) {
  return (req, res) => {
    // ここを書く（いまは、送られてきた ID をそのまま使い、毎回 Cookie を送っている）
    const id = parseCookies(req.headers.cookie)[cookieName] ?? store.create();
    req.session = store.get(id) ?? {};
    req.regenerateSession = () => {};
    req.destroySession = () => {};
    res.setHeader('Set-Cookie', serializeCookie(cookieName, id, { httpOnly: false, sameSite: null }));
    const result = handler(req, res);
    store.set(id, req.session);
    return result;
  };
}
