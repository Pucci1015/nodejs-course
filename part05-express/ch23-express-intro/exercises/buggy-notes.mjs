// 練習問題4: メモのアプリのバグを直す
// 動くように見えますが、確認スクリプトでいくつも失敗します。バグを直して、すべての確認を通してください。
//   $ bash check-notes.sh                    （このファイルを 127.0.0.1:9309 で起動して確かめる）
//   $ PORT=9309 node buggy-notes.mjs         （自分で起動して、curl で試すとき）
// 仕様は exercises/README.md の問題4の表です。
import express from 'express';

const app = express();

const notes = [
  { id: 1, title: '買い物', body: '牛乳と卵', tags: ['家'], views: 0 },
  { id: 2, title: '第23章', body: 'Express のルーティング', tags: ['勉強', 'node'], views: 0 },
];
let nextId = 3;

// 公開するファイル
app.use(express.static(import.meta.dirname));

app.get('/notes', (req, res) => {
  const tag = req.query.tag;
  if (tag === undefined) return res.json(notes);
  const wanted = tag.toLowerCase();
  res.json(notes.filter((n) => n.tags.some((t) => t.toLowerCase() === wanted)));
});

app.get('/notes/:id', (req, res) => {
  const note = notes.find((n) => n.id === Number(req.params.id));
  if (!note) {
    res.status(404).json({ error: 'not_found' });
  }
  note.views += 1;
  res.json(note);
});

app.get('/notes/search', (req, res) => {
  const q = String(req.query.q ?? '');
  res.json(notes.filter((n) => n.title.includes(q) || n.body.includes(q)));
});

app.post('/notes', (req, res) => {
  const { title, body = '' } = req.body;
  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(422).json({ error: 'validation', message: 'title を入力してください' });
  }
  const note = { id: nextId++, title: title.trim(), body: String(body), tags: [], views: 0 };
  notes.push(note);
  res.send(201);
});

// フォームから送ったとき（HTML の画面から使う）
app.post('/notes/form', express.urlencoded({ extended: false }), (req, res) => {
  const title = String(req.body.title ?? '').trim();
  if (title) notes.push({ id: nextId++, title, body: '', tags: [], views: 0 });
  res.redirect('/notes');
});

// エラーは JSON で返す
app.use((err, req, res) => {
  console.error(err);
  res.status(500).json({ error: 'internal' });
});

const port = Number(process.env.PORT ?? 9309);
app.listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}/ で待っています`);
});
