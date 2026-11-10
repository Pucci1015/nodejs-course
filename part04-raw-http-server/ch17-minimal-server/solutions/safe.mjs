// 練習問題3 の模範解答
export function safe(handler) {
  return async (req, res) => {
    try {
      await handler(req, res); // 同期の例外も、async の失敗も、ここで catch に来る
    } catch (err) {
      console.error(`${req.method} ${req.url} でエラー:`, err);
      if (res.headersSent) {
        res.destroy(); // もう 500 は返せない。途中までの返事を切る
        return;
      }
      const body = 'サーバの中でエラーが起きました\n';
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(body));
      res.end(body);
    }
  };
}
