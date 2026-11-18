// 第62章 練習問題8: 合言葉とヘルスチェックつきの、切り替えるプロキシ（本文6節）
import http from 'node:http';

export type SwitchProxyOptions = {
  /** 名前 → ポート（例: { blue: 9821, green: 9822 }）。行き先はどれも 127.0.0.1 */
  upstreams: Record<string, number>;
  /** 最初の行き先の名前 */
  active: string;
  /** 切り替えの API の合言葉（Authorization: Bearer …） */
  token: string;
  /** 切り替える前に確かめるパス。既定は '/healthz' */
  healthPath?: string;
  /** ヘルスチェックを待つ時間。既定は 2000 */
  healthTimeoutMs?: number;
};

/** まだ listen していない http.Server を返す */
export function createSwitchProxy(options: SwitchProxyOptions): http.Server {
  // ここを書く
  throw new Error(`まだ書いていません: ${JSON.stringify(Object.keys(options))} ${typeof http}`);
}
