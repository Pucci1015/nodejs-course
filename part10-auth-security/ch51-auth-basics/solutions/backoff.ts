// 第51章 練習問題6 の模範解答: 失敗が続くほど、待つ時間を長くする（締め出さずに遅くする）
export function createBackoff({ free = 3, baseSeconds = 1, maxSeconds = 300, now = Date.now } = {}) {
  /** キーごとの、続けて失敗した数と、次に試してよい時刻 */
  const state = new Map<string, { failures: number; until: number }>();

  return {
    /** あと何秒待てば試してよいか。0 なら今すぐ試してよい */
    wait(key: string): number {
      const s = state.get(key);
      if (s === undefined) return 0;
      return Math.max(0, Math.ceil((s.until - now()) / 1000));
    },
    fail(key: string): void {
      const failures = (state.get(key)?.failures ?? 0) + 1;
      // free 回までは待たない。その後は 1, 2, 4, 8 … 秒（maxSeconds まで）
      const seconds = failures <= free ? 0 : Math.min(maxSeconds, baseSeconds * 2 ** (failures - free - 1));
      state.set(key, { failures, until: now() + seconds * 1000 });
    },
    succeed(key: string): void {
      state.delete(key);
    },
  };
}
