// 第62章 練習問題6: 新しい版が動くまで待つコマンド（本文7節）
// 使い方: node wait-for-version.ts <URL> <版> [--timeout 秒] [--interval 秒]
import { parseArgs } from 'node:util';

const USAGE = '使い方: node wait-for-version.ts <URL> <版> [--timeout 秒] [--interval 秒]';

/** 1 回聞いて、版の文字列か、待つ理由（'応答 502' など）を返す */
async function ask(url: string): Promise<{ version: string } | { reason: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) return { reason: `応答 ${res.status}` };
    const body: unknown = await res.json();
    if (typeof body === 'object' && body !== null && 'version' in body && typeof body.version === 'string') {
      return { version: body.version };
    }
    return { reason: '版が書かれていません' };
  } catch {
    // つながらない・時間切れ・JSON でない
    return { reason: 'つながりません' };
  }
}

/** コマンドの本体。終了コードを返す（0: 来た、1: 時間切れ、2: 使い方の間違い） */
export async function main(argv: string[]): Promise<number> {
  let url: string, want: string, timeoutSec: number, intervalSec: number;
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { timeout: { type: 'string', default: '300' }, interval: { type: 'string', default: '5' } },
    });
    if (positionals.length !== 2) throw new Error('URL と版を渡してください');
    [url, want] = positionals as [string, string];
    timeoutSec = Number(values.timeout);
    intervalSec = Number(values.interval);
    if (!(timeoutSec > 0) || !(intervalSec > 0)) throw new Error('秒は 0 より大きい数で');
  } catch (err) {
    console.error(`${err instanceof Error ? err.message : String(err)}\n${USAGE}`);
    return 2;
  }

  const deadline = Date.now() + timeoutSec * 1000;
  for (let n = 1; ; n += 1) {
    const r = await ask(url);
    if ('version' in r && r.version === want) {
      console.log(`新しい版 ${want} が動いています（${n} 回目）`);
      return 0;
    }
    console.log(`待っています: ${'version' in r ? `今の版は ${r.version}` : r.reason}（${n} 回目）`);
    // 次に聞く時刻が締め切りを過ぎるなら、待たずに終わる
    if (Date.now() + intervalSec * 1000 > deadline) break;
    await new Promise((resolve) => setTimeout(resolve, intervalSec * 1000));
  }
  console.error(`時間切れ: ${timeoutSec} 秒たっても版 ${want} になりません`);
  return 1;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
