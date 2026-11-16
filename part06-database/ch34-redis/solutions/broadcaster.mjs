// 練習問題7 の模範解答

export function createBroadcaster(redis, channel) {
  return {
    async publish(event) {
      return redis.publish(channel, JSON.stringify(event));
    },

    async subscribe(handler) {
      // subscribe した接続は、ほかのコマンドを送れなくなる。渡された redis はそのまま使い続けたいので、
      // duplicate() で同じ設定の接続をもう1本作り、それを待つ専用にする
      const sub = redis.duplicate();
      sub.on('error', (err) => console.error('Redis（subscribe）のエラー:', err.message));
      await sub.connect();
      await sub.subscribe(channel, (message) => {
        let event;
        try {
          event = JSON.parse(message);
        } catch {
          return; // JSON でない知らせ（ほかのプログラムが送ったものなど）は捨てる
        }
        handler(event);
      });
      // 止める: 待つのをやめて、作った接続を閉じる
      return async () => {
        await sub.unsubscribe(channel);
        await sub.close();
      };
    },
  };
}
