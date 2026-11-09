// オフセットとカーソルのページ分けを比べる（第25章 6節）
//   $ node pagination-demo.mjs
//   別のターミナルで:
//     curl -s 'http://127.0.0.1:9322/offset?limit=3&offset=0'
//     curl -s -X POST http://127.0.0.1:9322/add          ← 新しいタスクを1つ足す（新しい順の先頭に入る）
//     curl -s 'http://127.0.0.1:9322/offset?limit=3&offset=3'   ← 1ページ目の最後と同じものが、また出る
//     curl -si 'http://127.0.0.1:9322/cursor?limit=3' | grep -iE '^(link|x-next)|^\['
//     （出てきた cursor を次に渡す: curl -s 'http://127.0.0.1:9322/cursor?limit=3&cursor=…'）
import express from 'express';
import { createTasks } from './tasks-db.mjs';

let t = Date.parse('2026-11-05T00:00:00.000Z');
const db = createTasks(10, { now: () => new Date((t += 60_000)) });
// 新しい順（createdAt の大きい順。同じなら id の大きい順）
const newestFirst = () => db.all().sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
const brief = (x) => ({ id: x.id, title: x.title, createdAt: x.createdAt });

const app = express();

app.post('/add', (req, res) => res.status(201).json(brief(db.create({ title: '後から足したタスク' }))));

// オフセット: 「先頭から何件飛ばすか」。分かりやすいが、途中で足したり消したりすると、ずれる
app.get('/offset', (req, res) => {
  const limit = Number(req.query.limit ?? 3);
  const offset = Number(req.query.offset ?? 0);
  res.json(newestFirst().slice(offset, offset + limit).map(brief));
});

// カーソル: 「前のページの最後のもの（の並べ替えのキー）より後」。途中で足しても、ずれない。
// サンプルなので、カーソルは base64url の JSON にしただけ（練習問題3では署名を付ける）
app.get('/cursor', (req, res) => {
  const limit = Number(req.query.limit ?? 3);
  let list = newestFirst();
  if (req.query.cursor) {
    const after = JSON.parse(Buffer.from(String(req.query.cursor), 'base64url').toString());
    list = list.filter((x) => x.createdAt < after.createdAt || (x.createdAt === after.createdAt && x.id < after.id));
  }
  const page = list.slice(0, limit);
  const hasMore = list.length > limit;
  if (hasMore) {
    const last = page.at(-1);
    const cursor = Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString('base64url');
    // 次のページの URL を Link ヘッダで知らせる（RFC 8288）
    res.set('Link', `</cursor?limit=${limit}&cursor=${cursor}>; rel="next"`);
    res.set('X-Next-Cursor', cursor);
  }
  res.json(page.map(brief));
});

app.listen(9322, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9322/ で待っています（Ctrl+C で止める）');
});
