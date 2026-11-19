// 第70章 練習問題5 の模範解答: 公開したアプリを、外から一通り確かめるコマンド（本文 3.3節）
// 使い方: node smoke.ts <URL>       例: node smoke.ts http://127.0.0.1:9913
// 終了コード: 0 すべて成功 / 1 失敗があった / 2 使い方の間違い
import { z } from 'zod';

/** JSON として読めなければ undefined */
function jsonOf(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

// 追加: 応答の形は Zod で確かめる（第38章 6節）。as で決めつけない
const Ready = z.object({ status: z.literal('ready') });
const Version = z.object({ version: z.string().min(1) });

/** ステータスが want でなければ、理由の文 */
const statusIs = (res: Response, want: number) => (res.status === want ? null : `${res.status}（${want} のはず）`);

/** 確かめること。どれも GET。ok は、合っていれば null、違えば「何が違うか」の文 */
export const CHECKS: { path: string; ok: (res: Response, body: string) => string | null }[] = [
  // 追加: 5つ。1つの確かめに1つの理由を返すので、どこが違うかがすぐ分かる
  { path: '/healthz', ok: (res) => statusIs(res, 200) },
  {
    path: '/readyz',
    ok: (res, body) =>
      statusIs(res, 200) ?? (Ready.safeParse(jsonOf(body)).success ? null : 'status が ready ではありません'),
  },
  {
    path: '/version',
    ok: (res, body) =>
      statusIs(res, 200) ?? (Version.safeParse(jsonOf(body)).success ? null : 'version が書かれていません'),
  },
  {
    path: '/',
    ok: (res) => {
      const type = res.headers.get('content-type') ?? '';
      return statusIs(res, 200) ?? (type.startsWith('text/html') ? null : `${type}（text/html のはず）`);
    },
  },
  { path: '/api/auth/me', ok: (res) => statusIs(res, 401) },
];

/** 1つ確かめて、合っていれば null、違えば理由。つながらないときも理由を返す（投げない） */
async function checkOne(base: string, check: (typeof CHECKS)[number]): Promise<string | null> {
  try {
    const res = await fetch(base + check.path, { signal: AbortSignal.timeout(5000), redirect: 'manual' });
    return check.ok(res, await res.text());
  } catch (err) {
    return err instanceof Error && err.name === 'TimeoutError' ? '5 秒たっても応答がありません' : 'つながりません';
  }
}

/**
 * コマンドの本体。終了コードを返す
 * - 引数が URL 1つでなければ、使い方を console.error に出して 2
 * - CHECKS を順に1つずつ確かめ、1行ずつ console.log に出す
 *     合っていれば '[OK] /healthz'、違えば '[NG] /readyz: 503（200 のはず）' のように、理由を付ける
 *     つながらない・5 秒たっても応答が無いときも NG（例外で止まらない）
 * - 最後の行は、全部合っていれば 'すべて成功しました'（0）、違えば 'N 件失敗しました'（1）
 */
export async function main(argv: string[]): Promise<number> {
  const [url, ...rest] = argv;
  if (url === undefined || rest.length > 0 || !URL.canParse(url)) {
    console.error('使い方: node smoke.ts <URL>   例: node smoke.ts http://127.0.0.1:9913');
    return 2;
  }
  // 追加: 最後の / を取る（'http://…/' + '/healthz' が // にならないように）
  const base = url.replace(/\/+$/, '');
  let failed = 0;
  // 追加: 順に1つずつ（for … of の中の await）。出力の順が CHECKS の順にそろう
  for (const check of CHECKS) {
    const reason = await checkOne(base, check);
    if (reason === null) console.log(`[OK] ${check.path}`);
    else {
      failed++;
      console.log(`[NG] ${check.path}: ${reason}`);
    }
  }
  console.log(failed === 0 ? 'すべて成功しました' : `${failed} 件失敗しました`);
  return failed === 0 ? 0 : 1;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
