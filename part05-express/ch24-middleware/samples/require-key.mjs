// 第24章 5節で書く、設定を受け取ってミドルウェアを返す関数の完成形
// 使い方（~/dev/part05/ch24-middleware で）: node samples/require-key.mjs
//   curl で: curl -i http://127.0.0.1:9317/api/secret   curl -i -H 'X-Api-Key: dev-only-key' http://127.0.0.1:9317/api/secret
import express from 'express';

const PORT = 9317;
const app = express();
app.disable('x-powered-by');

function requireKey(expected) {
  if (typeof expected !== 'string' || expected === '') {
    throw new TypeError('requireKey: 鍵を文字列で渡してください'); // 作る時点で確かめる
  }
  return (req, res, next) => {
    if (req.get('x-api-key') !== expected) {
      return res.status(401).json({ error: 'unauthorized' }); // 応答したら return
    }
    next();
  };
}

app.get('/api/public', (req, res) => res.json({ message: 'だれでも見られます' }));
app.get('/api/secret', requireKey('dev-only-key'), (req, res) => res.json({ message: '鍵を知っている人だけ' }));

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
