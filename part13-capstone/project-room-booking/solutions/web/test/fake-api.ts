// テストのための、偽の API。fetch の代わりに使い、メモリの上で本物の API と同じように答える
// ログイン（/api/auth/…）と、会議室・予約（第69章。docs/api.md）。ログインしていなければ、ほかの /api は 401

export type Call = { method: string; path: string; body: unknown; headers: Headers };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });
const problem = (status: number, detail: string, errors?: { pointer: string; detail: string }[]) =>
  json(status, { type: 'about:blank', title: String(status), status, detail, ...(errors ? { errors } : {}) });

/** 偽の API が知っている人（パスワードは平文。テストのためだけ） */
type Account = { id: number; email: string; password: string; verified: boolean; role: 'member' | 'admin' };

// 追加（第69章）: 会議室と予約
export type FakeRoom = { id: number; name: string; capacity: number; active: boolean };
export type FakeBooking = {
  id: number;
  roomId: number;
  userId: number;
  title: string;
  startsAt: string;
  endsAt: string;
};
/** 最初からある会議室（3つ目は停止している） */
const ROOMS: FakeRoom[] = [
  { id: 1, name: '会議室A', capacity: 6, active: true },
  { id: 2, name: '会議室B', capacity: 4, active: true },
  { id: 3, name: '旧会議室', capacity: 8, active: false },
];
/** 日本の日付の 0 時（UTC では前の日の 15:00） */
const dayStart = (date: string) => new Date(`${date}T00:00:00+09:00`).getTime();
export const PASSWORD = 'purple-otter-rides-91';
/** メールのリンクの #token= に入っている、使えるトークン（43 文字） */
export const VERIFY_TOKEN = 'v'.repeat(43);
export const RESET_TOKEN = 'r'.repeat(43);

/**
 * @param options.loggedIn  最初からログインしているか（既定は alice としてログインしている）
 * @param options.as        だれとしてログインしているか（'admin' なら管理者の admin@example.com）
 * @param options.bookings  最初からある予約（userId 1 が alice、2 が bob）
 */
export function createFakeApi({
  loggedIn = true,
  as = 'alice',
  bookings: seed = [],
}: { loggedIn?: boolean; as?: 'alice' | 'admin'; bookings?: Omit<FakeBooking, 'id'>[] } = {}) {
  const accounts: Account[] = [
    { id: 1, email: 'alice@example.com', password: PASSWORD, verified: true, role: 'member' },
    { id: 2, email: 'bob@example.com', password: PASSWORD, verified: true, role: 'member' },
    { id: 3, email: 'carol@example.com', password: PASSWORD, verified: false, role: 'member' }, // 確認がまだ
    { id: 4, email: 'admin@example.com', password: PASSWORD, verified: true, role: 'admin' },
  ];
  let me: Account | null = loggedIn ? (accounts.find((a) => a.email.startsWith(as)) ?? null) : null;
  const rooms: FakeRoom[] = ROOMS.map((r) => ({ ...r }));
  const bookings: FakeBooking[] = seed.map((b, i) => ({ ...b, id: i + 1 }));
  let nextBookingId = bookings.length + 1;
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
          return me ? json(200, { id: me.id, email: me.email, role: me.role }) : problem(401, 'ログインしてください');
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
    return roomsAndBookings(me, method, url, body);
  }

  // 追加（第69章）: 会議室と予約。本物の API の決まりのうち、画面のテストに要るものだけ
  function roomsAndBookings(me: Account, method: string, url: URL, body: unknown): Response {
    const b = (body ?? {}) as Partial<FakeRoom & FakeBooking>;
    const out = (x: FakeBooking) => ({
      id: x.id,
      roomId: x.roomId,
      roomName: rooms.find((r) => r.id === x.roomId)?.name ?? '',
      title: x.title,
      startsAt: x.startsAt,
      endsAt: x.endsAt,
      mine: x.userId === me.id,
    });
    const id = Number(url.pathname.split('/')[3]);
    const route = `${method} ${url.pathname.replace(/\/\d+$/, '/:id')}`;
    switch (route) {
      case 'GET /api/rooms': {
        const all = url.searchParams.get('all') === '1';
        if (all && me.role !== 'admin') return problem(403, '管理者だけが使えます');
        return json(200, { items: rooms.filter((r) => all || r.active) });
      }
      case 'POST /api/rooms':
      case 'PATCH /api/rooms/:id': {
        if (me.role !== 'admin') return problem(403, '管理者だけが使えます');
        if (rooms.some((r) => r.name === b.name && r.id !== id))
          return problem(409, 'その名前の会議室は、もうあります');
        if (method === 'POST') {
          const room = { id: rooms.length + 1, name: b.name ?? '', capacity: b.capacity ?? 1, active: true };
          rooms.push(room);
          return json(201, room);
        }
        const room = rooms.find((r) => r.id === id);
        if (!room) return problem(404, 'その会議室はありません');
        Object.assign(room, body);
        return json(200, room);
      }
      case 'GET /api/bookings': {
        const from = dayStart(url.searchParams.get('date') ?? '');
        const items = bookings.filter((x) => Date.parse(x.startsAt) < from + 86_400_000 && Date.parse(x.endsAt) > from);
        return json(200, { items: items.map(out) });
      }
      case 'GET /api/bookings/mine': {
        // 本物と同じく、終わっていないものを、始まりの早い順に
        const items = bookings
          .filter((x) => x.userId === me.id && Date.parse(x.endsAt) > Date.now())
          .toSorted((x, y) => Date.parse(x.startsAt) - Date.parse(y.startsAt));
        return json(200, { items: items.map(out) });
      }
      case 'POST /api/bookings': {
        if ((b.title ?? '').trim() === '')
          return problem(422, '入力が正しくありません', [{ pointer: '#/title', detail: '題名を入れてください' }]);
        const s = Date.parse(b.startsAt ?? '');
        const e = Date.parse(b.endsAt ?? '');
        if (bookings.some((x) => x.roomId === b.roomId && Date.parse(x.startsAt) < e && s < Date.parse(x.endsAt)))
          return problem(409, 'その時間は、ほかの予約と重なっています');
        const created = {
          id: nextBookingId++,
          roomId: b.roomId ?? 0,
          userId: me.id,
          title: (b.title ?? '').trim(),
          startsAt: new Date(s).toISOString(),
          endsAt: new Date(e).toISOString(),
        };
        bookings.push(created);
        return json(201, out(created));
      }
      case 'DELETE /api/bookings/:id': {
        const i = bookings.findIndex((x) => x.id === id);
        if (i < 0) return problem(404, 'その予約はありません');
        if (bookings[i]?.userId !== me.id && me.role !== 'admin')
          return problem(403, '取り消せるのは、予約した人か管理者です');
        bookings.splice(i, 1);
        return new Response(null, { status: 204 });
      }
    }
    return problem(404, 'ありません');
  }

  return {
    fetch: handle,
    calls,
    rooms,
    bookings,
    /** ほかの人（bob）が予約したことにする（SSE の知らせのテストで使う） */
    addBookingByOther: (x: Omit<FakeBooking, 'id' | 'userId'>) => {
      bookings.push({ ...x, id: nextBookingId++, userId: 2 });
    },
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
