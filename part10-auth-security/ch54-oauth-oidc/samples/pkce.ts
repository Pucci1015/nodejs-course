// 3.1節: ログインのリンク（認可のリクエストの URL）を作る
// 動かし方: node samples/pkce.ts   （先に、別のターミナルで npm run idp）
import { createHash, randomBytes } from 'node:crypto';

const random = () => randomBytes(32).toString('base64url');

const state = random(); // 戻ってきたとき「自分が始めたログインか」を確かめる値
const nonce = random(); // ID トークンに入れてもらい、「このログインのためのトークンか」を確かめる値
const verifier = random(); // PKCE の合言葉。サーバだけが覚えておき、トークンと取り替えるときに見せる
const challenge = createHash('sha256').update(verifier).digest('base64url'); // 合言葉のハッシュ。先に IdP に渡す

const url = new URL('http://127.0.0.1:9640/authorize');
url.search = new URLSearchParams({
  response_type: 'code',
  client_id: 'task-app',
  redirect_uri: 'http://127.0.0.1:9647/auth/callback',
  scope: 'openid email profile',
  state,
  nonce,
  code_challenge: challenge,
  code_challenge_method: 'S256',
}).toString();

console.log('state:    ', state);
console.log('nonce:    ', nonce);
console.log('verifier: ', verifier);
console.log('challenge:', challenge);
console.log();
console.log(url.href);
