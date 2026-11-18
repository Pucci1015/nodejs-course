// テストのための、偽の API。fetch の代わりに使い、メモリの上で本物の API と同じように答える
// 土台はログイン（/api/auth/…）だけ。ログインしていなければ、ほかの /api は 401。会議室と予約は第69章で足す

export type Call = { method: string; path: string; body: unknown; headers: Headers };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });
const problem = (status: number, detail: string, errors?: { pointer: string; detail: string }[]) =>
  json(status, { type: 'about:blank', title: String(status), status, detail, ...(errors ? { errors } : {}) });

/** 偽の API が知っている人（パスワードは平文。テストのためだけ） */
type Account = { id: number; email: string; password: string; verified: boolean };
export const PASSWORD = 'purple-otter-rides-91';
/** メールのリンクの #token= に入っている、使えるトークン（43 文字） */
export const VERIFY_TOKEN = 'v'.repeat(43);
export const RESET_TOKEN = 'r'.repeat(43);

/**
 * @param options.loggedIn  最初からログインしているか（既定は alice としてログインしている）
 */
export function createFakeApi({ loggedIn = true }: { loggedIn?: boolean } = {}) {
  const accounts: Account[] = [
    { id: 1, email: 'alice@example.com', password: PASSWORD, verified: true },
    { id: 2, email: 'carol@example.com', password: PASSWORD, verified: false }, // 確認がまだ
  ];
  let me: Account | null = loggedIn ? (accounts[0] ?? null) : null;
  const calls: Call[] = [];
  let failNext: Response | null = null;

  async function handle(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      'http://localhost',
    );
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path: url.pathname + url.search, body, headers });
    await Promise.resolve();
    if (failNext) {
      const r = failNext;
      failNext = null;
      return r;
    }

    // ログイン
    if (url.pathname.startsWith('/api/auth/')) {
      const b = (body ?? {}) as { email?: string; password?: string; token?: string };
      const account = accounts.find((a) => a.email === b.email?.trim().toLowerCase());
      switch (`${method} ${url.pathname}`) {
        case 'GET /api/auth/me':
          return me ? json(200, { id: me.id, email: me.email }) : problem(401, 'ログインしてください');
        case 'POST /api/auth/login':
          if (!account || account.password !== b.password) return problem(401, 'メールアドレスかパスワードが違います');
          if (!account.verified)
            return json(403, {
              type: 'urn:room-booking:email-not-verified',
              title: '403',
              status: 403,
              detail: 'メールアドレスの確認がまだです',
            });
          me = account;
          return new Response(null, { status: 204 });
        case 'POST /api/auth/logout':
          me = null;
          return new Response(null, { status: 204 });
        case 'POST /api/auth/register':
          if ((b.password ?? '').length < 12)
            return problem(422, '入力が正しくありません', [
              { pointer: '#/password', detail: 'パスワードは 12 文字以上にしてください' },
            ]);
          return json(202, { detail: 'メールを送りました' });
        case 'POST /api/auth/resend-verification':
        case 'POST /api/auth/forgot-password':
          return json(202, { detail: 'メールを送りました' });
        case 'POST /api/auth/verify-email':
          return b.token === VERIFY_TOKEN
            ? new Response(null, { status: 204 })
            : problem(400, 'リンクが正しくないか、期限が切れています');
        case 'POST /api/auth/reset-password':
          if (b.token !== RESET_TOKEN) return problem(400, 'リンクが正しくないか、期限が切れています');
          if ((b.password ?? '').length < 12)
            return problem(422, '入力が正しくありません', [
              { pointer: '#/password', detail: 'パスワードは 12 文字以上にしてください' },
            ]);
          return new Response(null, { status: 204 });
      }
      return problem(404, 'ありません');
    }
    if (me === null) return problem(401, 'ログインしてください');
    return problem(404, 'ありません');
  }

  return {
    fetch: handle,
    calls,
    /** セッションが切れたことにする（この後は 401） */
    expireSession: () => {
      me = null;
    },
    /** 次の1回だけ、この応答を返す */
    failNext: (status: number, detail: string) => {
      failNext = problem(status, detail);
    },
  };
}
