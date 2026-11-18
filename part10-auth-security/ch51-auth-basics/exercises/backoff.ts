// 第51章 練習問題6: 失敗が続くほど、待つ時間を長くする（本文6節）
export function createBackoff({ free = 3, baseSeconds = 1, maxSeconds = 300, now = Date.now } = {}) {
  // ここを書く（キーごとの状態を Map に持つ）
  void free;
  void baseSeconds;
  void maxSeconds;
  void now;

  return {
    /** あと何秒待てば試してよいか（切り上げ）。0 なら今すぐ試してよい */
    wait(key: string): number {
      throw new Error(`まだ書いていません: ${key}`);
    },
    /** 失敗したら呼ぶ */
    fail(key: string): void {
      throw new Error(`まだ書いていません: ${key}`);
    },
    /** 成功したら呼ぶ（数え直し） */
    succeed(key: string): void {
      throw new Error(`まだ書いていません: ${key}`);
    },
  };
}
