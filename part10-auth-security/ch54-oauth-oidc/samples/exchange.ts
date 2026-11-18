// 3.3節: 戻ってきたコードを、トークンに取り替える（アプリのサーバがすること）
// 動かし方: node samples/exchange.ts コード verifier
const [code, verifier] = process.argv.slice(2);
if (code === undefined || verifier === undefined) {
  console.error('使い方: node exchange.ts コード verifier');
  process.exit(2);
}

// アプリの確かめ: client_id と client_secret を「:」でつなぎ、base64 にして Authorization ヘッダに入れる
const basic = Buffer.from('task-app:dev-only-client-secret').toString('base64');

const res = await fetch('http://127.0.0.1:9640/token', {
  method: 'POST',
  headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: 'http://127.0.0.1:9647/auth/callback',
    code_verifier: verifier,
  }),
});
const body: unknown = await res.json();
console.log(res.status, body);

// ID トークンの中身（2つ目の部分）を読む。まだ署名は確かめていない（4節）
if (typeof body === 'object' && body !== null && 'id_token' in body && typeof body.id_token === 'string') {
  const [, payload = ''] = body.id_token.split('.');
  console.log(JSON.parse(Buffer.from(payload, 'base64url').toString()));
}
