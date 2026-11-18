// 追加（第10部）: ログイン・登録などの API を呼ぶ関数。Cookie はブラウザが自動で付ける（同じオリジンなので credentials の設定は要らない）
import { z } from 'zod';
import { ApiError, jsonInit, request } from './client.ts';

export const MeSchema = z.object({ id: z.number(), email: z.string().nullable() });
export type Me = z.infer<typeof MeSchema>;

/** ログインしている人。していなければ null（401 は「失敗」ではなく「ログインしていない」という答え） */
export async function getMe(signal?: AbortSignal): Promise<Me | null> {
  try {
    return MeSchema.parse(await request('/auth/me', { signal }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/** 確認がまだのときの 403 か（problem の type で見分ける） */
export const isUnverified = (err: unknown) =>
  err instanceof ApiError && err.status === 403 && err.problem.type === 'urn:task-api:email-not-verified';

type Credentials = { email: string; password: string };

export async function login(c: Credentials): Promise<void> {
  await request('/auth/login', jsonInit('POST', c));
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' });
}

/** 登録。登録済みのアドレスでも同じ答え（202）が返る。本当のことはメールで本人にだけ届く */
export async function register(c: Credentials): Promise<void> {
  await request('/auth/register', jsonInit('POST', c));
}

export async function resendVerification(c: Credentials): Promise<void> {
  await request('/auth/resend-verification', jsonInit('POST', c));
}

export async function verifyEmail(token: string): Promise<void> {
  await request('/auth/verify-email', jsonInit('POST', { token }));
}

export async function forgotPassword(email: string): Promise<void> {
  await request('/auth/forgot-password', jsonInit('POST', { email }));
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await request('/auth/reset-password', jsonInit('POST', { token, password }));
}
