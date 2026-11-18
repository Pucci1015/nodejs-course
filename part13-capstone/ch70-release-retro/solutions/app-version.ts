// 第70章 練習問題1 の模範解答: /version で返す版を決める（本文 2.2節・5.3節）

/** 空の文字は、書いていないのと同じにする */
const given = (v: string | undefined): string | undefined => (v === undefined || v === '' ? undefined : v);

/**
 * 環境変数から、/version で返す版を決める
 * - APP_VERSION が書いてあれば、それ
 * - 無ければ RENDER_GIT_COMMIT（Render が渡すコミットの ID）
 * - どちらも無ければ 'dev'
 * 空の文字（Dockerfile の ARG APP_VERSION= で何も渡さなかったとき）は、書いていないのと同じにする
 */
export function appVersion(env: Record<string, string | undefined>): string {
  // 修正: ?? は undefined と null しか飛ばさないので、'' を先に undefined にする
  return given(env.APP_VERSION) ?? given(env.RENDER_GIT_COMMIT) ?? 'dev';
}

const COMMIT = /^[0-9a-f]{7,}$/;

/**
 * /version から来た版（got）が、待っている版（want）か
 * - 2つともコミットの ID（0〜9・a〜f だけで 7 文字以上）なら、短いほうが長いほうの頭であれば同じ
 * - それ以外は、完全に同じときだけ
 */
export function sameVersion(got: string, want: string): boolean {
  if (COMMIT.test(got) && COMMIT.test(want)) {
    // 修正: どちらが短いかは分からないので、両方の向きで比べる
    return got.startsWith(want) || want.startsWith(got);
  }
  return got === want;
}
