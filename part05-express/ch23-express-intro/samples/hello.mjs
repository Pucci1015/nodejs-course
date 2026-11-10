// 第23章 2節で書く、いちばん小さな Express のアプリの完成形
// 使い方（~/dev/part05/ch23-express-intro で）: node samples/hello.mjs → curl -i http://127.0.0.1:9307/hello/alice
import express from 'express';

const PORT = 9307;
const app = express();
app.disable('x-powered-by'); // 何で動いているかを外に知らせない

app.get('/hello/:name', (req, res) => {
  res.json({ message: `こんにちは、${req.params.name}さん` });
});

console.log('typeof app =', typeof app);
app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
