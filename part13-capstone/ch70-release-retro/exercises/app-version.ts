// 第70章 練習問題1: /version で返す版を決める（本文 2.2節・5.3節）

/**
 * 環境変数から、/version で返す版を決める
 * - APP_VERSION が書いてあれば、それ
 * - 無ければ RENDER_GIT_COMMIT（Render が渡すコミットの ID）
 * - どちらも無ければ 'dev'
 * 空の文字（Dockerfile の ARG APP_VERSION= で何も渡さなかったとき）は、書いていないのと同じにする
 */
export function appVersion(env: Record<string, string | undefined>): string {
  // ここを書く
  throw new Error(`まだ書いていません（${Object.keys(env).length}）`);
}

/**
 * /version から来た版（got）が、待っている版（want）か
 * - 2つともコミットの ID（0〜9・a〜f だけで 7 文字以上）なら、短いほうが長いほうの頭であれば同じ
 * - それ以外は、完全に同じときだけ
 */
export function sameVersion(got: string, want: string): boolean {
  // ここを書く
  throw new Error(`まだ書いていません（${got} ${want}）`);
}
