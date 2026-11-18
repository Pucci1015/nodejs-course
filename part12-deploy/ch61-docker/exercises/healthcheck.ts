// 第61章 練習問題3: HEALTHCHECK で動かす、ヘルスチェックのコマンド（本文6節）
// 使い方: node healthcheck.ts [URL]
//   URL を省くと http://127.0.0.1:${PORT ?? 9817}/healthz
//   終了コード: 0 = 元気（2xx）、1 = 元気でない（2xx 以外・つながらない・時間切れ）
//   時間切れ: 環境変数 HEALTHCHECK_TIMEOUT_MS（既定 2000）

export async function check(url: string, timeoutMs: number): Promise<{ ok: boolean; reason?: string }> {
  // ここを書く
  throw new Error(`まだ書いていません: ${url} ${timeoutMs}`);
}

if (import.meta.main) {
  // ここを書く（check を呼び、失敗なら理由を標準エラー出力に書いて、終了コードを決める）
  console.error('まだ書いていません');
  process.exitCode = 1;
}
