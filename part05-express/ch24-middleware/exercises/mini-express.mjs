// 練習問題2: Express の芯（ミドルウェアの列と next）を自分で作る
// 要件は exercises/README.md の問題2です。確かめ方:
//   $ node --test mini-express.test.mjs
//
// 作るもの:
//   const app = createMiniExpress();
//   app.use(fn, …) / app.use('/prefix', fn, …)
//   app.get('/users/:id', fn, …)  （post・put・patch・delete も）
//   http.createServer(app)        （app は (req, res) を受け取る関数）

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

export function createMiniExpress() {
  // 登録した順に並ぶ「層」の配列。1つの層は { kind: 'use' | 'route', … } のような形にするとよい
  const layers = [];

  function app(req, res) {
    // ここを書く: layers を前から順にたどる next を作って、最初の層から動かす
    res.statusCode = 404;
    res.end(`Cannot ${req.method} ${req.url}`);
  }

  app.use = (...args) => {
    // ここを書く: 最初の引数が文字列ならパスの前置き、残りは関数
    return app;
  };

  for (const method of METHODS) {
    app[method] = (path, ...handlers) => {
      // ここを書く
      return app;
    };
  }

  return app;
}
