// 練習問題3: メソッドとパスで、ハンドラを選ぶ Router
// 仕様は README の練習問題3を見てください。問題2の pattern.mjs を使います。
// 確かめる: node --test router.test.mjs
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { comparePatterns, matchPath, parsePattern } from './pattern.mjs';

export class Router {
  #routes = [];

  /** ルートを1つ登録する。handler は (req, res, params) で呼ばれる */
  add(method, pattern, handler) {
    this.#routes.push({ method: method.toUpperCase(), pattern, handler });
    return this;
  }
  get(pattern, handler) { return this.add('GET', pattern, handler); }
  post(pattern, handler) { return this.add('POST', pattern, handler); }
  put(pattern, handler) { return this.add('PUT', pattern, handler); }
  patch(pattern, handler) { return this.add('PATCH', pattern, handler); }
  delete(pattern, handler) { return this.add('DELETE', pattern, handler); }

  /**
   * http.createServer（または createApp）に渡す関数。
   * アロー関数のフィールドにしてあるので、router.handle をそのまま渡しても this が失われない
   */
  handle = async (req, res) => {
    // ここを書く（今は、登録した順に、メソッドと req.url が完全に同じものを探すだけ）
    const route = this.#routes.find((r) => r.method === req.method && r.pattern === req.url);
    if (!route) throw new HttpError(404, 'ありません');
    await route.handler(req, res, {});
  };
}
