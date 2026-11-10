// 練習問題2 の模範解答
import express from 'express';

export function createGreetApp() {
  const app = express();
  app.disable('x-powered-by');

  app.get('/greet', (req, res) => {
    const name = req.query.name;
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name を1つ指定してください' });
    }
    res.json({ message: `こんにちは、${name.trim()}さん` });
  });

  app.post('/echo', express.json(), (req, res) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'JSON で送ってください' });
    }
    res.json({ received: req.body });
  });

  return app;
}
