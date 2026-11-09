// いちばん簡単な Router（第18章 4節）
// パターンを正規表現に変えて、登録した順に試す。練習問題2・3で、足りないところを直していく
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

// 正規表現で特別な意味を持つ文字を、ただの文字にする（"v1.0" の "." が「何でも1文字」にならないように）
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "/users/:id" → { regex: /^\/users\/([^/]+)$/, keys: ['id'] } */
export function compile(pattern) {
  const keys = [];
  const source = pattern
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        keys.push(seg.slice(1));
        return '([^/]+)'; // / 以外の 1 文字以上 = 1つのセグメント
      }
      return escapeRegExp(seg);
    })
    .join('/');
  return { regex: new RegExp(`^${source}$`), keys };
}

export class SimpleRouter {
  routes = [];

  add(method, pattern, handler) {
    this.routes.push({ method, pattern, ...compile(pattern), handler });
    return this;
  }

  handle = async (req, res) => {
    const url = new URL(`http://localhost${req.url}`);
    const allowed = new Set();
    for (const route of this.routes) {
      const m = route.regex.exec(url.pathname);
      if (!m) continue;
      if (route.method !== req.method) {
        allowed.add(route.method); // パスはあてはまったが、メソッドが違う
        continue;
      }
      const params = {};
      route.keys.forEach((key, i) => (params[key] = decodeURIComponent(m[i + 1])));
      req.query = url.searchParams;
      return route.handler(req, res, params);
    }
    if (allowed.size > 0) throw new HttpError(405, 'このメソッドは使えません', { headers: { Allow: [...allowed].join(', ') } });
    throw new HttpError(404, 'ありません');
  };
}
