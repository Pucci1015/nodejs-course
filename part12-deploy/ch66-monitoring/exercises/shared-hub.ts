// 第66章 練習問題8: 台をまたいで SSE の知らせを配るハブ。Redis の Pub/Sub で全台に流し、各台が自分の客に配る（本文 7.3節）

/** 使う所だけの Redis の接続の形（node-redis の createClient() の戻り値が、この形を持つ） */
export type RedisClient = {
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string, listener: (message: string) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
};
export type HubEvent = { type: string; data: unknown };
export type Listener = (event: HubEvent) => void;

export type SharedHub = {
  /** channel を購読し始める */
  start(): Promise<void>;
  /** この台の、userId の客を足す。戻り値を呼ぶと外す */
  subscribe(userId: string, listener: Listener): () => void;
  /** userId への知らせを、全部の台に流す */
  publish(userId: string, event: HubEvent): Promise<void>;
  /** 購読をやめる（接続は閉じない） */
  close(): Promise<void>;
};

export function createSharedHub(options: { publisher: RedisClient; subscriber: RedisClient; channel: string }): SharedHub {
  // ここを書く
  throw new Error(`まだ書いていません（${options.channel}）`);
}
