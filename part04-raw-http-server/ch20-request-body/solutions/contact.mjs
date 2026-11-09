// 問題4 解答例: お問い合わせフォームと JSON の API を、直したもの
// 使い方: node contact.mjs   → ブラウザで http://127.0.0.1:9205/
import http from 'node:http';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { redirect, sendHtml, sendJson } from '../../ch17-minimal-server/solutions/send.mjs';
import { Router } from '../../ch18-routing/solutions/router.mjs';
import { readForm, readJson } from './body.mjs';
import { pick } from './merge.mjs';

const PORT = Number(process.env.PORT ?? 9205);
const LIMIT = 10 * 1024; // 修正: ボディの上限（10KB）
const messages = [];
let nextId = 1;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// 修正: 入力された値は、必ずエスケープしてから HTML に入れる（第21章）
function formPage(values = {}, errors = []) {
  const v = (k) => esc(values[k] ?? '');
  const checked = (t) => (values.topics ?? []).includes(t) ? ' checked' : '';
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>お問い合わせ</title></head><body>
<h1>お問い合わせ</h1>
${errors.length ? `<ul class="errors">${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
<form method="post" action="/contact">
  <p><label>名前 <input name="name" value="${v('name')}"></label></p>
  <p><label>メール <input name="email" value="${v('email')}"></label></p>
  <p><label>内容<br><textarea name="message">${v('message')}</textarea></label></p>
  <p>話題: <label><input type="checkbox" name="topics" value="node"${checked('node')}> node</label>
           <label><input type="checkbox" name="topics" value="flask"${checked('flask')}> flask</label></p>
  <p><button>送る</button></p>
</form></body></html>`;
}

// 修正: 値が無い・文字列でない場合も考える。文字数は [...s].length（絵文字も1文字）
function validate(data) {
  const errors = [];
  const str = (k) => (typeof data[k] === 'string' ? data[k] : '');
  const len = (s) => [...s].length;
  const name = str('name').trim();
  if (name === '' || len(name) > 50) errors.push('名前は 1〜50 文字で書いてください');
  if (!/^[^\s@]+@[^\s@]+$/.test(str('email').trim())) errors.push('メールの形が正しくありません');
  const message = str('message');
  if (message.trim() === '' || len(message) > 1000) errors.push('内容は 1〜1000 文字で書いてください');
  if (data.topics !== undefined && (!Array.isArray(data.topics) || !data.topics.every((t) => t === 'node' || t === 'flask'))) {
    errors.push('話題は node か flask の配列にしてください');
  }
  return errors;
}

function save(data) {
  // 修正: 決めたキーだけを取り出して保存する。id などを客に決めさせない
  const msg = { id: nextId++, ...pick(data, ['name', 'email', 'message']), topics: data.topics ?? [] };
  msg.name = msg.name.trim();
  msg.email = msg.email.trim();
  messages.push(msg);
  return msg;
}

const router = new Router()
  .get('/', (req, res) => sendHtml(res, 200, formPage()))
  .get('/thanks', (req, res) => sendHtml(res, 200, '<!doctype html><meta charset="utf-8"><title>送りました</title><p>ありがとうございました</p>'))
  .get('/api/messages', (req, res) => sendJson(res, 200, messages))
  .post('/contact', async (req, res) => {
    // 修正: 文字に戻すのは全部そろってから（readForm）。+ も URLSearchParams が空白に戻す
    const params = await readForm(req, { limit: LIMIT });
    const data = {
      name: params.get('name') ?? '',
      email: params.get('email') ?? '',
      message: params.get('message') ?? '',
      topics: params.getAll('topics'), // 修正: 同じ名前が何回も来る
    };
    const errors = validate(data);
    // 修正: 入力の間違いは 422。入力した値を残して、もう一度フォームを見せる
    if (errors.length) return sendHtml(res, 422, formPage(data, errors));
    save(data);
    return redirect(res, '/thanks', 303); // 修正: PRG。再読み込みで2回送られない
  })
  .post('/api/messages', async (req, res) => {
    // 修正: 415（Content-Type）・400（読めない JSON）・413（大きすぎる）は readJson が投げる
    const data = await readJson(req, { limit: LIMIT });
    if (data === null || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'JSON のオブジェクトを送ってください');
    const errors = validate(data);
    if (errors.length) return sendJson(res, 422, { errors });
    const msg = save(data);
    return sendJson(res, 201, msg, { Location: `/api/messages/${msg.id}` });
  });

http.createServer(createApp(router.handle)).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
