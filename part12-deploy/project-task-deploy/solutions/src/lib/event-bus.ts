// 追加（第12部）: タスクの知らせを、Redis の Pub/Sub で全部の台に流す（第66章 練習問題8の shared-hub.ts から）
// 台 A で変えたタスクの知らせが、台 B につないでいる客にも届く。各台は、届いた知らせを自分のハブ（event-hub.ts）に渡す
import { z } from 'zod';

/** 使う所だけの Redis の接続の形（node-redis の createClient() の戻り値が、この形を持つ） */
export type PubSubClient = {
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string, listener: (message: string) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
};

// Redis から届くものは、ほかのプログラムが流したものかもしれないので、形を確かめる
const Message = z.object({ userId: z.number().int().positive(), type: z.string().min(1), data: z.unknown() });
export type BusMessage = z.infer<typeof Message>;

export function createEventBus(options: {
  publisher: PubSubClient;
  subscriber: PubSubClient;
  channel: string;
  /** 届いた知らせを受け取る（この台のハブに渡す） */
  onMessage: (m: BusMessage) => void;
}) {
  const { publisher, subscriber, channel, onMessage } = options;
  return {
    async start(): Promise<void> {
      // Pub/Sub を待つ接続は、ほかのコマンドに使えないので、publisher とは別の接続（第6部 第34章 6節）
      await subscriber.subscribe(channel, (raw) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return; // JSON でないものは捨てる
        }
        const m = Message.safeParse(parsed);
        if (m.success) onMessage(m.data);
      });
    },
    /** 全部の台に流す。自分の台の客にも、Redis を通って届く（ここで直接配ると、自分の台だけ 2 回届く） */
    async publish(userId: number, type: string, data: unknown): Promise<void> {
      await publisher.publish(channel, JSON.stringify({ userId, type, data }));
    },
    async close(): Promise<void> {
      await subscriber.unsubscribe(channel);
    },
  };
}
