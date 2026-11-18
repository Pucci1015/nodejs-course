// 第66章 練習問題8: 台をまたいで SSE の知らせを配るハブ。Redis の Pub/Sub で全台に流し、各台が自分の客に配る（本文 7.3節）
import { z } from 'zod';

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

// Redis から届くものは、ほかのプログラムが流したものかもしれないので、形を確かめる
const Message = z.object({ userId: z.string().min(1), event: z.object({ type: z.string().min(1), data: z.unknown() }) });

export function createSharedHub(options: { publisher: RedisClient; subscriber: RedisClient; channel: string }): SharedHub {
  const { publisher, subscriber, channel } = options;
  const listeners = new Map<string, Set<Listener>>(); // userId → この台の客

  function deliver(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return; // JSON でないものは捨てる
    }
    const m = Message.safeParse(parsed);
    if (!m.success) return;
    for (const l of listeners.get(m.data.userId) ?? []) {
      try {
        l({ type: m.data.event.type, data: m.data.event.data });
      } catch {
        // 1 人の客の失敗で、ほかの客に届かなくならないように
      }
    }
  }

  return {
    async start() {
      // Pub/Sub を待つ接続は、ほかのコマンドに使えないので、publisher とは別の接続（第6部 第34章 6節）
      await subscriber.subscribe(channel, deliver);
    },
    subscribe(userId, listener) {
      const set = listeners.get(userId) ?? new Set<Listener>();
      set.add(listener);
      listeners.set(userId, set);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(userId);
      };
    },
    async publish(userId, event) {
      // 自分の台の客にも、Redis を通って届く（ここで直接配ると、自分の台だけ 2 回届く）
      await publisher.publish(channel, JSON.stringify({ userId, event }));
    },
    async close() {
      await subscriber.unsubscribe(channel);
      listeners.clear();
    },
  };
}
