// 練習問題6 解答例: メソッドとパスで、ハンドラを選ぶ Router
// 第19章からも、この Router を使います
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { comparePatterns, matchPath, parsePattern } from './pattern.mjs';

// Allow ヘッダに並べる順番
const ORDER = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export class Router {
  #routes = [];

  /** ルートを1つ登録する。handler は (req, res, params) で呼ばれる */
  add(method, pattern, handler) {
    const route = { method: method.toUpperCase(), pattern, segments: parsePattern(pattern), handler };
    this.#routes.push(route);
    // 登録した順ではなく、具体的なものが先になるように並べ直す（sort は安定なので、同じなら登録順）
    this.#routes.sort((a, b) => comparePatterns(a.segments, b.segments));
    return this;
  }
  get(pattern, handler) { return this.add('GET', pattern, handler); }
  post(pattern, handler) { return this.add('POST', pattern, handler); }
  put(pattern, handler) { return this.add('PUT', pattern, handler); }
  patch(pattern, handler) { return this.add('PATCH', pattern, handler); }
  delete(pattern, handler) { return this.add('DELETE', pattern, handler); }

  /** pathname にあてはまるルートを、[route, params] の配列で返す（具体的な順） */
  #matchAll(pathname) {
    const found = [];
    for (const route of this.#routes) {
      let params;
      try {
        params = matchPath(route.segments, pathname);
      } catch (err) {
        if (err instanceof URIError) throw new HttpError(400, 'URL の %xx の形が正しくありません');
        throw err;
      }
      if (params) found.push([route, params]);
    }
    return found;
  }

  /** http.createServer（または createApp）に渡す関数 */
  handle = async (req, res) => {
    // req.url は、ふつうは "/" で始まる。"//evil.com/x" や "http://..." や "*" も届くことがある
    if (!req.url.startsWith('/')) throw new HttpError(400, 'リクエストの対象が正しくありません');
    // new URL(req.url, base) だと "//evil.com/x" が別のホストとして読まれるので、文字列をつないでから読む
    const url = new URL(`http://localhost${req.url}`);
    req.pathname = url.pathname;
    req.query = url.searchParams;

    const matched = this.#matchAll(url.pathname);
    if (matched.length === 0) {
      // 最後の / の有る無しだけが違うなら、正しい方へ 308 で案内する
      const alt = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : `${url.pathname}/`;
      // "//evil.com" のような Location は、別のサイトへのリダイレクトになるので使わない
      if (alt !== '' && !alt.startsWith('//') && this.#matchAll(alt).length > 0) {
        res.writeHead(308, { Location: alt + url.search, 'Content-Length': 0 });
        res.end();
        return;
      }
      throw new HttpError(404, 'ありません');
    }

    const method = req.method;
    const pick = (m) => matched.find(([route]) => route.method === m);
    let hit = pick(method);
    if (!hit && method === 'HEAD') hit = pick('GET'); // HEAD は GET と同じハンドラで答える（本文は Node.js が捨てる）

    if (!hit) {
      const methods = new Set(matched.map(([route]) => route.method));
      if (methods.has('GET')) methods.add('HEAD');
      methods.add('OPTIONS');
      const allow = ORDER.filter((m) => methods.has(m)).join(', ');
      if (method === 'OPTIONS') {
        res.writeHead(204, { Allow: allow });
        res.end();
        return;
      }
      throw new HttpError(405, 'このメソッドは使えません', { headers: { Allow: allow } });
    }

    const [route, params] = hit;
    req.params = params;
    await route.handler(req, res, params);
  };
}
