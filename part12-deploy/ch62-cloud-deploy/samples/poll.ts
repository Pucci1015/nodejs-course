// 第62章 6節: /version を 50 ミリ秒ごとに聞き続け、1秒ごとに「どの版が何回・失敗が何回」を書く
// デプロイの間に、客から見て失敗があったかを数える
// 動かし方（章のフォルダで）: node samples/poll.ts [URL]   （既定は http://127.0.0.1:9820/version。Ctrl+C で止める）
const url = process.argv[2] ?? 'http://127.0.0.1:9820/version';
let counts = new Map<string, number>();

function add(key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

setInterval(() => {
  const line = [...counts].map(([k, n]) => `${k}=${n}`).join(' ');
  console.log(`${new Date().toISOString().slice(11, 19)} ${line || '(応答なし)'}`);
  counts = new Map();
}, 1000);

for (;;) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const body = (await res.json()) as { version?: string };
      add(String(body.version));
    } else {
      add(`失敗${res.status}`);
    }
  } catch {
    add('つながらない');
  }
  await new Promise((r) => setTimeout(r, 50));
}
