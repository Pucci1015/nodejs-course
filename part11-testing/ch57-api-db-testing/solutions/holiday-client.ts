// 練習問題7 の模範解答: 休みの日の API を、覚えておいて使う
import { fetchHolidays, UpstreamError, type Holiday } from '../exercises/holidays.ts';

export interface HolidayClientOptions {
  baseUrl: string;
  ttlMs?: number;
  now?: () => number;
  timeoutMs?: number;
}

export interface HolidayClient {
  get(year: number): Promise<Holiday[]>;
  isHoliday(date: string): Promise<boolean>;
}

// 追加: 年ごとに覚えるもの
interface Entry {
  holidays: Holiday[];
  fetchedAt: number;
}

export function createHolidayClient({ baseUrl, ttlMs = 24 * 60 * 60 * 1000, now = Date.now, timeoutMs }: HolidayClientOptions): HolidayClient {
  const cache = new Map<number, Entry>();
  // 頼んでいる途中の Promise。同時に頼まれたら、同じものを待たせる
  const inFlight = new Map<number, Promise<Holiday[]>>();

  async function refresh(year: number): Promise<Holiday[]> {
    try {
      const holidays = await fetchHolidays(year, { baseUrl, timeoutMs });
      cache.set(year, { holidays, fetchedAt: now() });
      return holidays;
    } catch (err) {
      const stale = cache.get(year);
      // 古くても、無いよりはよい。一度も読めていなければ、失敗をそのまま伝える
      if (err instanceof UpstreamError && stale !== undefined) return stale.holidays;
      throw err;
    } finally {
      inFlight.delete(year);
    }
  }

  async function get(year: number): Promise<Holiday[]> {
    const entry = cache.get(year);
    if (entry !== undefined && now() - entry.fetchedAt < ttlMs) return entry.holidays;
    let pending = inFlight.get(year);
    if (pending === undefined) {
      pending = refresh(year);
      inFlight.set(year, pending);
    }
    return pending;
  }

  return {
    get,
    async isHoliday(date) {
      const holidays = await get(Number(date.slice(0, 4)));
      return holidays.some((holiday) => holiday.date === date);
    },
  };
}
