// 練習問題4 用: タイムアウトしたら送り直す、よくあるクライアント
// 使い方: node retry-client.mjs [--key] [タイトル] [API の URL]
//   既定: タイトル「牛乳を買う（再送の実験）」、URL http://localhost:8520/api/tasks
//   --key を付けると、操作ごとに1つ Idempotency-Key を作り、送り直すときも同じキーを付ける。
//
//   1回の待ち時間は 250ms。サーバの保存（既定 300ms）より短いので、1回目は必ずタイムアウトする。
//   最大4回まで送る。409（同じキーのリクエストを処理中）が返ったら、少し待ってから送り直す。
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const args = process.argv.slice(2);
const useKey = args.includes('--key');
const [title = '牛乳を買う（再送の実験）', url = 'http://localhost:8520/api/tasks'] = args.filter((a) => a !== '--key');

const TIMEOUT_MS = 250;
const MAX_ATTEMPTS = 4;
const key = useKey ? randomUUID() : null; // 送り直しても同じキーを使う（ここが大事）
const started = Date.now();
const t = () => `${String(Date.now() - started).padStart(4)}ms`;

if (key) console.log(`Idempotency-Key: ${key}`);
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
      body: JSON.stringify({ title }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.text();
    const replayed = res.headers.get('idempotent-replayed') ? '（Idempotent-Replayed: ' + res.headers.get('idempotent-replayed') + '）' : '';
    console.log(`${t()} ${attempt}回目: ${res.status} ${replayed} ${body.trim()}`);
    if (res.status === 409) {
      await sleep(200);
      continue;
    }
    break;
  } catch (err) {
    console.log(`${t()} ${attempt}回目: ${err.name === 'TimeoutError' ? 'タイムアウト' : err.message}。送り直します`);
  }
}

await sleep(1000); // サーバでの保存が、すべて終わるのを待つ
const tasks = await (await fetch(url)).json();
const same = tasks.filter((x) => x.title === title);
console.log(`\n「${title}」のタスクは ${same.length} 個あります（id: ${same.map((x) => x.id).join(', ')}）`);
