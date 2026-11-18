// 追加（第11部）: E2E の道具。届いたメールを読む・テストの準備を API で済ませる
// 名前が .spec.ts で終わらないので、これ自体はテストとして動かない
import { type APIRequestContext, expect } from '@playwright/test';
import { MAIL_URL, WEB_URL } from '../playwright.config.ts';

export const WEB_ORIGIN = WEB_URL;
export const PASSWORD = 'purple-otter-rides-91';

/** テストごとに別の人になるメールアドレス */
export function newEmail(name: string): string {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
}

type Mail = { to: string[]; subject: string; text: string };

/** to に届いたメールのうち、件名に subject を含む最新のものを、届くまで待って返す */
export async function waitForMail(request: APIRequestContext, to: string, subject: string): Promise<Mail> {
  let found: Mail | undefined;
  await expect
    .poll(
      async () => {
        const res = await request.get(`${MAIL_URL}/api/messages`);
        const list = (await res.json()) as Mail[];
        found = list.findLast((m) => m.to.includes(to) && m.subject.includes(subject));
        return found !== undefined;
      },
      { message: `${to} に「${subject}」のメールが届きません` },
    )
    .toBe(true);
  if (found === undefined) throw new Error('届いていません');
  return found;
}

/** メールの本文から、このアプリのリンク（http://127.0.0.1:9496/… の形）を取り出す */
export function linkIn(mail: Mail): string {
  const link = mail.text.split(/\s+/).find((word) => word.startsWith(`${WEB_URL}/`));
  if (link === undefined) throw new Error(`メールにリンクがありません: ${mail.text}`);
  return link;
}

/**
 * 準備のために、画面を通さず API で「登録 → 確認 → ログイン」まで済ませる。
 * 画面で確かめたいことは別のテストで確かめてあるので、ここでは速さを取る（第58章 9節）
 * POST には、画面と同じ Origin を付ける（API が別のサイトからの POST を断るため。第52章）
 */
export async function signUpByApi(request: APIRequestContext, email: string): Promise<void> {
  const headers = { origin: WEB_ORIGIN };
  const register = await request.post(`${WEB_URL}/api/auth/register`, { headers, data: { email, password: PASSWORD } });
  expect(register.status()).toBe(202);
  const mail = await waitForMail(request, email, '確認');
  const token = new URL(linkIn(mail)).hash.replace('#token=', '');
  const verify = await request.post(`${WEB_URL}/api/auth/verify-email`, { headers, data: { token } });
  expect(verify.status()).toBe(204);
}
