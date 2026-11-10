// 第18章 10節で書く、ミドルウェアを順に呼ぶサーバの完成形
// 使い方（~/dev/part04/ch18-routing で）: node samples/mw.mjs
//   別のターミナルで: curl -i http://127.0.0.1:9183/
import http from 'node:http';

const PORT = 9183;

// ミドルウェア: (req, res, next) を受け取る。next() で次へ進む
const logger = async (req, res, next) => {
  const start = performance.now();
  console.log('前:', req.method, req.url);
  await next(); // 後ろが全部終わるまで待つ
  console.log('後:', res.statusCode, `${(performance.now() - start).toFixed(1)}ms`);
};

const addHeader = async (req, res, next) => {
  res.setHeader('X-Powered-By', 'my-own-server');
  await next();
};

const handler = async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('ハンドラの返事です\n');
};

// list を前から1つずつ呼ぶ。i 番目の next() は、i + 1 番目を呼ぶ
function run(list, req, res, i = 0) {
  if (i === list.length) return;
  return list[i](req, res, () => run(list, req, res, i + 1));
}

const server = http.createServer((req, res) => run([logger, addHeader, handler], req, res));

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
