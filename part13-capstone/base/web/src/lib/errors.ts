// 失敗を、画面に出す文にする
import { ApiError } from '../api/client.ts';

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 412) return 'ほかの人が先に変えました。読み直してから、もう一度やってください';
    return err.message;
  }
  if (err instanceof TypeError) return 'サーバにつながりません。API が動いているか確かめてください';
  return err instanceof Error ? err.message : 'うまくいきませんでした';
}

export const isNotFound = (err: unknown) => err instanceof ApiError && err.status === 404;
