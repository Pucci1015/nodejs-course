// 練習問題7: 休みの日の API を、覚えておいて（キャッシュして）使う部品を書く
import { fetchHolidays, UpstreamError, type Holiday } from './holidays.ts';

export interface HolidayClientOptions {
  baseUrl: string;
  /** 覚えておく時間（ミリ秒）。既定は1日 */
  ttlMs?: number;
  /** 「今」をミリ秒で返す関数。テストでは偽物を渡す */
  now?: () => number;
  timeoutMs?: number;
}

export interface HolidayClient {
  get(year: number): Promise<Holiday[]>;
  isHoliday(date: string): Promise<boolean>;
}

export function createHolidayClient({ baseUrl, ttlMs = 24 * 60 * 60 * 1000, now = Date.now, timeoutMs }: HolidayClientOptions): HolidayClient {
  // ここを書く
  void fetchHolidays;
  void UpstreamError;
  void [baseUrl, ttlMs, now, timeoutMs];
  throw new Error('まだ書いていません');
}
