// 練習問題1: 10個のハンドラ。それぞれ、curl -i で開いたときに何が返るか（または、どうなるか）を予想する
// 確かめる: node predict-run.mjs <番号>   （1〜10。all で全部）
export const handlers = {
  1(req, res) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('abc');
  },
  2(req, res) {
    res.write('x');
    res.statusCode = 404;
    res.end();
  },
  3(req, res) {
    res.writeHead(302, { Location: '/next' });
    res.end();
  },
  4(req, res) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write('途中まで');
  },
  5(req, res) {
    res.end('1回目');
    res.end('2回目');
  },
  6(req, res) {
    res.setHeader('Content-Length', '2');
    res.end('abc');
  },
  7(req, res) {
    res.end(123);
  },
  8(req, res) {
    res.writeHead(204, { 'Content-Type': 'text/plain' });
    res.end('本文');
  },
  9(req, res) {
    // HEAD で開く（node predict-run.mjs 9 は curl -I と同じ HEAD を送る）
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('あいう');
  },
  10(req, res) {
    res.setHeader('Set-Cookie', 'a=1');
    res.setHeader('Set-Cookie', 'b=2');
    res.appendHeader('Set-Cookie', 'c=3');
    res.end();
  },
};
