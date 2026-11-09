// req と res に Express が足したもの（第23章 4節）
//   $ node req-res-demo.mjs
//   別のターミナルで:
//     curl -i http://127.0.0.1:9302/send/text      curl -i http://127.0.0.1:9302/send/object
//     curl -i http://127.0.0.1:9302/send/buffer    curl -i http://127.0.0.1:9302/send/number
//     curl -i http://127.0.0.1:9302/redirect       curl -i http://127.0.0.1:9302/no-content
//     curl -i -H 'If-None-Match: W/"…"' http://127.0.0.1:9302/send/object   （1回目の ETag を入れる）
//     curl -i http://127.0.0.1:9302/twice          ← サーバのターミナルに ERR_HTTP_HEADERS_SENT
//     curl -i http://127.0.0.1:9302/whoami -H 'Accept: text/html'
import express from 'express';

const app = express();
// 何で動いているかを、わざわざ外に知らせない（第2部 第6章で見た Server ヘッダと同じ考え方）
app.disable('x-powered-by');

// res.send は、渡した値の種類で Content-Type を決める
app.get('/send/text', (req, res) => res.send('<p>文字列は text/html になる</p>'));
app.get('/send/object', (req, res) => res.send({ kind: 'オブジェクトは JSON になる' }));
app.get('/send/buffer', (req, res) => res.send(Buffer.from('Buffer は application/octet-stream')));
// 数を渡すと「数の JSON」になる（ステータスコードにはならない）。ステータスは res.status か res.sendStatus
app.get('/send/number', (req, res) => res.send(404));

// res.redirect は、何も指定しないと 302。POST の後に GET の画面へ送るなら 303（第2部 第7章）
app.get('/redirect', (req, res) => res.redirect('/send/text'));
app.post('/after-post', (req, res) => res.redirect(303, '/send/text'));

// 204 は本文を持てない。json に何を渡しても、本文は送られない
app.get('/no-content', (req, res) => res.status(204).json({ ignored: true }));

// 2回返そうとすると、2回目で例外になる（第17章 4.2節の ERR_HTTP_HEADERS_SENT と同じ）
app.get('/twice', (req, res) => {
  res.json({ first: true });
  res.json({ second: true });
});

// req にも便利なものが足されている
app.get('/whoami', (req, res) => {
  res.json({
    method: req.method,
    path: req.path, // クエリを除いたパス
    originalUrl: req.originalUrl,
    ip: req.ip,
    accept: req.get('accept'), // ヘッダは大文字・小文字を区別せずに読める
    wantsHtml: req.accepts(['json', 'html']), // Accept を見て、どちらを返すべきか（第2部 第7章 7節）
  });
});

app.listen(9302, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9302/ で待っています（Ctrl+C で止める）');
});
