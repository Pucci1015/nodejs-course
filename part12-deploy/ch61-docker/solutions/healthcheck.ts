// 第61章 練習問題3の模範解答: HEALTHCHECK で動かす、ヘルスチェックのコマンド（本文6節）
// 使い方: node healthcheck.ts [URL]
//   URL を省くと http://127.0.0.1:${PORT ?? 9817}/healthz
//   終了コード: 0 = 元気（2xx）、1 = 元気でない（2xx 以外・つながらない・時間切れ）
//   時間切れ: 環境変数 HEALTHCHECK_TIMEOUT_MS（既定 2000）

export async function check(url: string, timeoutMs: number): Promise<{ ok: boolean; reason?: string }> {
  try {
    // redirect: 'manual' で、リダイレクトをたどらない（/healthz が別の所へ送るのは、何かがおかしい）
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'manual' });
    // 本文を読み切る（読まずに終わると、接続が残ることがある）
    await res.arrayBuffer();
    if (res.status >= 200 && res.status < 300) return { ok: true };
    return { ok: false, reason: `状態コード ${res.status}` };
  } catch (err) {
    // 時間切れ（TimeoutError）も、つながらない（TypeError: fetch failed）も、ここに来る
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return { ok: false, reason };
  }
}

if (import.meta.main) {
  const url = process.argv[2] ?? `http://127.0.0.1:${process.env.PORT ?? 9817}/healthz`;
  const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 2000);
  const r = await check(url, timeoutMs);
  if (!r.ok) console.error(`元気ではありません: ${url}（${r.reason}）`);
  process.exitCode = r.ok ? 0 : 1;
}
