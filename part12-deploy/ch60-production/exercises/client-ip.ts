// 第60章 練習問題3: プロキシの後ろで、客の IP アドレスを決める（本文7節）

export type ClientIpInput = {
  /** TCP でつながってきた相手（req.socket.remoteAddress） */
  remoteAddress: string;
  /** X-Forwarded-For ヘッダの値（無ければ undefined） */
  forwardedFor: string | undefined;
  /** 前に何段のプロキシがあるか（信じてよい段の数） */
  trustedHops: number;
};

export function clientIp(input: ClientIpInput): string {
  // ここを書く
  throw new Error(`まだ書いていません: ${JSON.stringify(input)}`);
}
