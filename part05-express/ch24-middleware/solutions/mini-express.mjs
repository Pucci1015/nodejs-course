// 練習問題2の模範解答: Express の芯（ミドルウェアの列と next）
// Express の本物（router パッケージの index.js・layer.js・route.js）も、大きくはこの形をしている
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/** '/users/:id' を { re, names } にする（:名前 は / を含まない1つ以上の文字） */
function compileRoute(path) {
  const names = [];
  const source = path
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        names.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 追加: ふつうの文字は、正規表現の記号として扱わない
    })
    .join('/');
  return { re: new RegExp(`^${source}$`), names };
}

/** prefix（'/admin'）が pathname にあてはまるか。'/admin' と '/admin/…' はよいが、'/adminx' はだめ */
function matchesPrefix(prefix, pathname) {
  if (prefix === '/') return true;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function createMiniExpress() {
  const layers = [];

  function app(req, res) {
    const originalUrl = req.url;
    req.originalUrl ??= originalUrl;
    req.baseUrl ??= '';
    let index = 0;

    // 追加: 誰も応答しなかったとき・誰もエラーを受け止めなかったとき（Express の finalhandler にあたる）
    function done(err) {
      if (err) {
        if (res.headersSent) {
          res.destroy(); // 途中まで送ってしまった。切って、失敗を客に知らせる
          return;
        }
        const s = Number(err.status ?? err.statusCode);
        res.statusCode = Number.isInteger(s) && s >= 400 && s <= 599 ? s : 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Internal Server Error'); // 中身は見せない
        return;
      }
      if (res.headersSent) return;
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`Cannot ${req.method} ${originalUrl.split('?')[0]}`);
    }

    /** 1つの関数を動かす。同期の throw も、Promise の reject も、next(err) にする */
    function call(fn, err, nextFn) {
      try {
        const result = err === undefined ? fn(req, res, nextFn) : fn(err, req, res, nextFn);
        if (result && typeof result.then === 'function') result.then(undefined, (e) => nextFn(e ?? new Error('reject')));
      } catch (e) {
        nextFn(e);
      }
    }

    // 追加: 同じ next を2回呼んでも、次は1回しか動かないようにする
    function once(fn) {
      let called = false;
      return (arg) => {
        if (called) return;
        called = true;
        fn(arg);
      };
    }

    function next(err) {
      // use(パス) の中で書き換えた req.url・req.baseUrl を、次の層へ進む前に元に戻す
      req.url = originalUrl;
      req.baseUrl = '';
      if (err === 'route') err = undefined; // ルートの外で next('route') が来たら、ふつうの next と同じ
      const layer = layers[index++];
      if (!layer) return done(err);

      const pathname = originalUrl.split('?')[0];
      const query = originalUrl.slice(pathname.length);

      if (layer.kind === 'use') {
        if (!matchesPrefix(layer.prefix, pathname)) return next(err);
        const isErrorHandler = layer.fn.length === 4;
        if (err !== undefined && !isErrorHandler) return next(err); // エラーのときは、引数4つのものだけ
        if (err === undefined && isErrorHandler) return next(); // エラーが無いときは、引数4つのものを飛ばす
        if (layer.prefix !== '/') {
          req.baseUrl = layer.prefix;
          req.url = (pathname.slice(layer.prefix.length) || '/') + query;
        }
        return call(layer.fn, err, once(next));
      }

      // kind === 'route'
      if (err !== undefined) return next(err); // ルートのハンドラは、エラーを受け取らない
      const method = req.method === 'HEAD' ? 'GET' : req.method;
      if (layer.method !== method) return next();
      const m = layer.re.exec(pathname);
      if (!m) return next();
      try {
        req.params = Object.fromEntries(layer.names.map((name, i) => [name, decodeURIComponent(m[i + 1])]));
      } catch {
        return next(Object.assign(new Error('URL の %xx の形が正しくありません'), { status: 400 }));
      }

      // 1つのルートに、ハンドラが複数あってもよい。next('route') で残りを飛ばす
      let h = 0;
      const step = (e) => {
        if (e === 'route') return next();
        if (e !== undefined) return next(e);
        const fn = layer.handlers[h++];
        if (!fn) return next();
        call(fn, undefined, once(step));
      };
      step();
    }

    next();
  }

  app.use = (...args) => {
    const prefix = typeof args[0] === 'string' ? args.shift().replace(/\/+$/, '') || '/' : '/';
    if (args.length === 0 || !args.every((f) => typeof f === 'function')) throw new TypeError('use には関数を渡してください');
    for (const fn of args) layers.push({ kind: 'use', prefix, fn });
    return app;
  };

  for (const method of METHODS) {
    app[method] = (path, ...handlers) => {
      if (typeof path !== 'string' || !path.startsWith('/')) throw new TypeError('パスは / で始めてください');
      if (handlers.length === 0 || !handlers.every((f) => typeof f === 'function')) throw new TypeError('ハンドラは関数にしてください');
      layers.push({ kind: 'route', method: method.toUpperCase(), ...compileRoute(path), handlers });
      return app;
    };
  }

  return app;
}
