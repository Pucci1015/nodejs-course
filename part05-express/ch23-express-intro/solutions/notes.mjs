// 練習問題4の模範解答: メモのアプリのバグを直したもの
//   $ bash ../exercises/check-notes.sh ../solutions/notes.mjs
import path from 'node:path';
import express from 'express';

const app = express();
app.disable('x-powered-by'); // 修正: 何で動いているかを知らせない

const notes = [
  { id: 1, title: '買い物', body: '牛乳と卵', tags: ['家'], views: 0 },
  { id: 2, title: '第23章', body: 'Express のルーティング', tags: ['勉強', 'node'], views: 0 },
];
let nextId = 3;

class ApiError extends Error {
  constructor(status, error, message) {
    super(message);
    this.status = status;
    this.error = error;
  }
}

// 修正: 公開するのは public フォルダだけ。import.meta.dirname を公開すると、サーバのソースや
//       確認スクリプトまで誰でも読めてしまう（第19章 2節。.env があれば、それも）
//       このファイルは solutions/ にあるので、exercises/public を指す
app.use(express.static(path.join(import.meta.dirname, '..', 'exercises', 'public')));

app.get('/notes', (req, res) => {
  const tag = req.query.tag;
  if (tag === undefined) return res.json(notes);
  // 修正: ?tag=a&tag=b だと配列になる。toLowerCase が無いので、そのままでは 500 になっていた
  if (typeof tag !== 'string' || tag === '') throw new ApiError(400, 'bad_request', 'tag は1つだけ指定してください');
  const wanted = tag.toLowerCase();
  res.json(notes.filter((n) => n.tags.some((t) => t.toLowerCase() === wanted)));
});

// 修正: /notes/search を /notes/:id より先に登録する。後にあると、:id = 'search' として先に選ばれる
app.get('/notes/search', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  res.json(notes.filter((n) => n.title.includes(q) || n.body.includes(q)));
});

app.get('/notes/:id', (req, res) => {
  // 修正: Number('abc') は NaN。形を確かめて 400 にする
  if (!/^[1-9][0-9]*$/.test(req.params.id)) throw new ApiError(400, 'bad_request', 'id は正の整数で指定してください');
  const note = notes.find((n) => n.id === Number(req.params.id));
  if (!note) {
    // 修正: return が無いと、404 を返した後も続きを動かし、note.views で TypeError になっていた
    return res.status(404).json({ error: 'not_found' });
  }
  note.views += 1;
  res.json(note);
});

// 修正: express.json() が無いと req.body は undefined。415 は自分で返す（express.json は何もしないだけ）
app.post('/notes', express.json(), (req, res) => {
  if (!req.is('application/json')) throw new ApiError(415, 'unsupported_media_type', 'Content-Type は application/json にしてください');
  const input = req.body;
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(422, 'validation', 'ボディは JSON のオブジェクトにしてください');
  }
  const { title, body = '' } = input;
  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(422).json({ error: 'validation', message: 'title を入力してください' });
  }
  if (typeof body !== 'string') throw new ApiError(422, 'validation', 'body は文字列にしてください');
  const note = { id: nextId++, title: title.trim(), body, tags: [], views: 0 };
  notes.push(note);
  // 修正: res.send(201) は「201 という数の JSON」を 200 で返す。ステータスは res.status で決める
  res.status(201).location(`/notes/${note.id}`).json(note);
});

app.post('/notes/form', express.urlencoded({ extended: false }), (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (title) notes.push({ id: nextId++, title, body: '', tags: [], views: 0 });
  // 修正: POST の後に一覧の画面（GET）へ送るのは 303。何も書かないと 302 になる（第2部 第7章）
  res.redirect(303, '/notes');
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// 修正: エラーハンドラは引数が4つ。(err, req, res) の3つだと、Express はふつうのミドルウェアだと思い、
//       エラーのときには呼ばない（既定のエラーハンドラがスタックトレース入りの HTML を返していた）
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.error, message: err.message });
  const status = err.status ?? err.statusCode ?? 500;
  if (status < 500) return res.status(status).json({ error: 'bad_request', message: 'リクエストが正しくありません' });
  console.error(err);
  res.status(500).json({ error: 'internal' });
});

const port = Number(process.env.PORT ?? 9309);
app.listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}/ で待っています`);
});
