// 練習問題で使う、本文の samples のコピー（書き換えなくてよい）。第57章 8節: 外の API を呼ぶ部品。どこの API を呼ぶか（baseUrl）を引数で受け取る
// 休みの日の一覧を返す API（GET {baseUrl}/holidays/2026 → [{ "date": "2026-01-01", "name": "元日" }, …]）を考える
import { z } from 'zod';

const Holidays = z.array(z.object({ date: z.iso.date(), name: z.string() }));
export type Holiday = z.infer<typeof Holidays>[number];

/** 外の API が、期待した答えを返さなかった（第7部 第38章 6節） */
export class UpstreamError extends Error {
  override name = 'UpstreamError';
}

export async function fetchHolidays(year: number, { baseUrl, timeoutMs = 3000 }: { baseUrl: string; timeoutMs?: number }): Promise<Holiday[]> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/holidays/${year}`, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new UpstreamError(`休みの日の API につなげません: ${String(err)}`);
  }
  if (!res.ok) throw new UpstreamError(`休みの日の API が ${res.status} を返しました`);
  const parsed = Holidays.safeParse(await res.json().catch(() => undefined));
  if (!parsed.success) throw new UpstreamError('休みの日の API の答えの形が違います');
  return parsed.data;
}
