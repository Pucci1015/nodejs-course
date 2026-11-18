# 第69章 実装（後半）

第68章で作った API に、画面をつなぎます。その日の予約の表・予約のダイアログ・自分の予約・会議室の管理の4つのページを作り、ほかの人の予約が読み直さずに出るように SSE で知らせ、管理者の取り消しと前日のリマインドをメールで送ります。最後に、2つのブラウザで「片方の予約がもう片方に出る」ことを E2E で確かめます。これで、`docs/plan.md` に書いた「終わりの確かめ」が全部そろいます。

| 項目           | 内容                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 所要時間の目安 | 6〜8 時間（練習問題を除く）                                                                                                                                                                      |
| 前提           | 第68章。第8部（React・TanStack Query・アクセシビリティ）、第5部 第27章と第12部 第66章（SSE と Pub/Sub）、第12部 第64章（仕事の列と決まった時刻）                                                 |
| この章のゴール | API の決まりを画面でも使い、送る前に確かめられる。予約の知らせを SSE で配り、画面のキャッシュを読み直せる。2回動いても1通しか送らないリマインドを書ける。要件を画面のテストと E2E で確かめられる |

| フォルダ                 | 中身                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------ |
| [exercises/](exercises/) | 練習問題（8問）                                                                      |
| [solutions/](solutions/) | 練習問題の模範解答と、この章を終えたときのアプリ（[solutions/app/](solutions/app/)） |

> **読み方**
>
> 第68章の続きです。PostgreSQL と Redis を動かし、テストが通ることを確かめてから始めます。
>
> ```sh
> $ cd ~/dev/room-booking
> $ docker compose up -d --wait
> $ npm test                          # 第68章の終わりの 82 個
> $ (cd web && npm test)              # 画面の 14 個
> ```
>
> 画面を作る節では、3つのターミナルで、偽の SMTP サーバ・API・画面を動かしたままにしておくと、書いたものをすぐブラウザで見られます。
>
> ```sh
> $ npm run mail                      # ターミナル1: 偽の SMTP サーバ（届いたメールは http://127.0.0.1:8025/api/messages）
> $ npm run dev                       # ターミナル2: API（http://127.0.0.1:9900）。ワーカーも中で動く
> $ (cd web && npm run dev)           # ターミナル3: 画面（http://localhost:5174）
> ```

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと                                | 後で使う場所                                         |
| ----------------------------------------------- | ---------------------------------------------------- |
| API の決まり（`domain/`）を画面にコピーして使う | 第70章の振り返り（コピーのつらさ）、自分で作るアプリ |
| SSE の知らせでキャッシュを読み直す              | 自分で作るアプリのリアルタイムの機能                 |
| 2回動いても1通しか送らない仕事                  | 第70章の運用の手順（リマインドを送り直す）           |
| 画面のテスト（偽の API）と E2E（2つのブラウザ） | 第70章の CI                                          |

---

## 1. 画面から API を呼ぶ

### 1.1 手を動かす: 決まりを画面にコピーする

予約のダイアログでは、送る前に「21:00 を過ぎないか」「過去でないか」を確かめたくなります。API の `src/domain/` は、Node.js の API も Express も使わない純粋な関数なので、そのまま画面でも動きます。コピーします。

```sh
$ mkdir -p web/src/domain
$ cp src/domain/time.ts src/domain/booking-rules.ts src/domain/slots.ts web/src/domain/
```

コピーした3つのファイルの先頭に、1行足しておきます。

```ts
// API の src/domain/time.ts のコピー（第69章 1節）。画面でも同じ決まりで枠を作り、送る前に確かめる。API の側を直したら、ここも直す
```

| 書き方                             | 理由                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| コピーする（共有しない）           | `web/` は別の `package.json` のプロジェクト。共有の仕組み（npm の workspaces など）は、この規模では入れない。第67章の ADR で決めた |
| 「API の側を直したら、ここも直す」 | コピーは、片方だけ直すと食い違う。その危うさを、読む人に知らせる                                                                   |

画面で確かめるのは、使いやすさのためです。守っているのは API なので、画面の確かめをすり抜けても（古いコピーでも）、API が断ります。

### 1.2 手を動かす: 応答の形と、API を呼ぶ関数

`web/src/api/schemas.ts` に、`docs/api.md` の形を Zod で書きます（第8部 第43章 1.2節）。

```ts
export const BookingSchema = z.object({
  id: z.number(),
  roomId: z.number(),
  roomName: z.string(),
  title: z.string(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  mine: z.boolean(),
});
export type Booking = z.infer<typeof BookingSchema>;
export const BookingListSchema = z.object({ items: z.array(BookingSchema) });
```

`RoomSchema`・`RoomListSchema`、ダイアログの入力の `BookingInputSchema`（題名）、会議室のフォームの `RoomInputSchema`（定員は文字で入るので数にする）も同じファイルに書きます。

`web/src/api/bookings.ts` に、API を呼ぶ関数を書きます。土台の `client.ts` の `request`（problem+json を `ApiError` にする）と `jsonInit` を使います。

```ts
export async function listBookingsOn(date: string, signal?: AbortSignal): Promise<Booking[]> {
  return BookingListSchema.parse(await request(`/bookings?date=${date}`, { signal })).items;
}

export async function createBooking(input: NewBooking): Promise<Booking> {
  return BookingSchema.parse(await request('/bookings', jsonInit('POST', input)));
}
```

全体（会議室の3つと予約の4つ）は [solutions/app/web/src/api/bookings.ts](solutions/app/web/src/api/bookings.ts) です。

### 1.3 手を動かす: キャッシュのキーとフック

`web/src/api/queries.ts` に、TanStack Query のキーとフックを足します（第8部 第43章 3〜4節）。

```ts
/** キャッシュのキー。予約が変わったら ['bookings'] の下を全部読み直す */
export const bookingKeys = {
  all: ['bookings'] as const,
  day: (date: string) => ['bookings', 'day', date] as const,
  mine: ['bookings', 'mine'] as const,
};

export function useDayBookings(date: string) {
  return useQuery({ queryKey: bookingKeys.day(date), queryFn: ({ signal }) => listBookingsOn(date, signal) });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewBooking) => createBooking(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
  });
}
```

| キー                                | 中身                                                                  |
| ----------------------------------- | --------------------------------------------------------------------- |
| `['bookings', 'day', '2026-12-10']` | その日の予約                                                          |
| `['bookings', 'mine']`              | 自分の予約                                                            |
| `['bookings']`                      | 上の2つを全部まとめて指す（`invalidateQueries` はキーの頭で合わせる） |

予約を入れたら、その日の表も自分の予約も変わります。`['bookings']` で全部を「古い」にすれば、どれを読み直すか考えなくて済みます。`useRooms`・`useMyBookings`・`useCancelBooking`・`useCreateRoom`・`useUpdateRoom` も同じ形です。

```sh
$ (cd web && npx tsc)               # 型のエラーが無いこと
```

## 2. 「今」と知らせ

### 2.1 手を動かす: 「今」を state に持つ

表では、過ぎた枠をボタンにしません。描画の中で `new Date()` を呼ぶと、同じ props でも描画のたびに結果が変わります（第8部 第42章 1節）。`web/src/lib/now.ts` で、「今」を state に持ち、1分ごとに進めます。

```ts
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
```

同じファイルに、`'2026-12-10'` を `'12/10（木）'` にする `formatDay` も書きます。曜日は `getUTCDay()` で数えます（第67章 練習問題2）。

### 2.2 手を動かす: 予約の知らせを配る（API）

alice が予約したら、同じ日の表を開いている bob の画面にも出したい、と要件に書きました（ユーザーストーリー 3）。第12部の成果物と同じ形で、SSE で知らせます。

| ファイル                | 中身                                    | 元にしたもの                         |
| ----------------------- | --------------------------------------- | ------------------------------------ |
| `src/lib/sse-format.ts` | SSE の書き方（`formatEvent`）           | 第5部 第27章                         |
| `src/lib/event-hub.ts`  | 客に配るハブと、SSE のルート `sseRoute` | 第12部の成果物。人ごとのハブを外した |
| `src/lib/event-bus.ts`  | Redis の Pub/Sub で全部の台に流す       | 第12部の成果物。`userId` を外した    |

3つとも、第12部の成果物（`~/dev/task-api`）の `src/lib/` からコピーして、「全員に配る」形に直します。[solutions/app/src/lib/](solutions/app/src/lib/) と見比べてください。

サービスは、予約が入った・取り消されたときに `publish` を呼びます。サービスは SSE も Redis も知らず、受け取った関数を呼ぶだけです。

```ts
/** 知らせ（SSE で全員に配る。第69章 2節）。画面は、date の日を表示していたら読み直す */
export type BookingEvent = { id: number; roomId: number; date: string };
// …
const id = await bookings.insert({ ...input, userId: actor.id });
publish('booking.created', eventOf({ id, roomId: room.id, startsAt: input.startsAt }));
```

知らせには、題名もだれの予約かも入れません。受け取った画面は、`GET /api/bookings?date=…` で読み直すので、見てよいものだけを API が返します。知らせに中身を入れると、知らせの側でも「だれに何を見せてよいか」を考える必要が出てきます。

`src/server.ts` でハブとバスを作り、サービスに `publish` を渡し、`src/app.ts` に道を足します。

```ts
app.get('/api/events', loggedIn, sse);
```

止めるときは、`server.close()` の前に `sse.closeAll()` を呼びます。SSE の応答は終わらないので、閉じないと `server.close()` が時間切れまで待ちます（第5部 第27章 5節）。

`test/http/realtime.test.ts` の 1・2 番目が、知らせを確かめます。

```sh
$ node --test --test-name-pattern="SSE" test/http/realtime.test.ts
✔ 1. SSE: 予約が入った・取り消されたことが、ログインしている全員に届く
✔ 2. SSE はログインしていなければ 401
```

`--test-name-pattern` は、名前に合うテストだけを動かすオプションです（第2部 第7章）。テストの部品 `openEvents`（SSE を読む）は [solutions/app/test/support/helpers.ts](solutions/app/test/support/helpers.ts) にあります。

### 2.3 手を動かす: 知らせで読み直す（画面）

画面は、知らせが来たら予約のキャッシュを「古い」にします（第8部 第43章 7節）。

```ts
export function useBookingEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const source = new EventSource('/api/events');
    const refresh = () => void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    for (const type of ['booking.created', 'booking.canceled', 'reset']) source.addEventListener(type, refresh);
    return () => source.close();
  }, [queryClient]);
}
```

| 知らせ                                | すること                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `booking.created`・`booking.canceled` | 予約のキャッシュを全部古くする。表示しているもの（その日の表）だけが、すぐ読み直される |
| `reset`                               | つなぎ直したときに、取りこぼしがあった（第5部 第27章 4節）。同じく全部を読み直す       |

知らせの `date` を見て、表示している日のときだけ読み直すこともできます。しかし、表示していないキャッシュは、古くしても読み直されません（TanStack Query は、使われているキャッシュだけを読み直す）。それなら全部を古くするほうが、書くことが少なく、間違いもありません。

このフックは、ログインしている間だけ動かします。`RequireLogin` の中に `LoggedIn` を作り、そこで呼びます（ログインしていない人がつないでも、401 で断られるだけなので）。

```tsx
/** ログインしている間だけ、予約の知らせ（SSE）を受け取る（第69章 2節） */
function LoggedIn(): ReactNode {
  useBookingEvents();
  return <Outlet />;
}
```

## 3. その日の予約の表

### 3.1 手を動かす: 表を作る

`docs/screens.md` の「/ その日の予約」は、行が 30 分の枠、列が会議室の表です。`web/src/components/DayGrid.tsx` を作ります。第67章の `slotsOfDay`（その日の枠）と `markBusy`（枠ごとに重なる予約）を使います。

```tsx
const slots = slotsOfDay(date);
// 会議室ごとに、枠に重なる予約（無ければ null）
const columns = rooms.map((room) =>
  markBusy(
    slots,
    bookings.filter((b) => b.roomId === room.id),
  ),
);
```

いちばん考える所は、10:00〜11:00 の予約を、2つの枠をまたぐ1つのセルにする所です。HTML の表では、`rowSpan={2}` のセルを置き、下の行ではそのセルを出しません。

```tsx
const booking = busy[i] ?? null;
if (booking !== null) {
  // 上の枠と同じ予約なら、上のセルが rowSpan で覆っているので、セルを出さない
  if (i > 0 && busy[i - 1] === booking) return null;
  let span = 1;
  while (busy[i + span] === booking) span++;
  return (
    <td key={room.id} rowSpan={span} className={booking.mine ? 'booked mine' : 'booked'}>
      {booking.title}
      {booking.mine && '（自分）'}
    </td>
  );
}
// 過ぎた枠はボタンにしない
if (slot.start.getTime() <= now.getTime()) return <td key={room.id} className="past" />;
```

| 枠の状態            | セル                                                               |
| ------------------- | ------------------------------------------------------------------ |
| 予約の最初の枠      | `<td rowSpan={続く枠の数}>題名</td>`。自分の予約なら「（自分）」   |
| 予約の2つ目からの枠 | 出さない（`null`）                                                 |
| 過ぎた枠            | 空の `<td className="past">`                                       |
| 空いている枠        | 「空き」のボタン。名前は `aria-label` で「会議室B 14:00 から予約」 |

ボタンの見える文字は「空き」だけですが、スクリーンリーダーには「会議室B 14:00 から予約」と読ませます（第8部 第45章 5節）。この名前は、そのままテストで探す名前になります（`docs/screens.md` に書いた名前）。表には `<caption>`（見えないようにしてある）と、列と行の見出し（`<th scope="col">`・`<th scope="row">`）を付けます。

### 3.2 手を動かす: 日付を URL に持つページ

`web/src/pages/DayPage.tsx` です。表示している日付は、URL の `?date=` に持ちます（第8部 第44章 4節）。リンクを送れば同じ日が開き、ブラウザの「戻る」で前の日に戻れます。

```tsx
const now = useNow();
const today = tokyoParts(now).date;
const [params, setParams] = useSearchParams();
const asked = params.get('date');
// 正しくない ?date= は、今日として扱う
const date = asked !== null && isDateString(asked) ? asked : today;
// …
const go = (d: string) => setParams(d === today ? {} : { date: d });
```

「前の日」「次の日」「今日」のボタンで `go` を呼びます。今日は `?date=` を書かないので、`/` が「今日の表」になります。会議室が1つも無ければ、表の代わりに「会議室がまだありません。管理者に足してもらってください。」を出します。

`web/src/routes.tsx` の、ログインが要るページの `index` を `DayPage` にし、土台の `HomePage.tsx` は消します。

すると、土台のテストが落ちます。ログインした後のページの見出しを「会議室の予約」（土台の `HomePage`）の名前で探していたからです。

| ファイル                 | 直すこと                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `web/test/auth.test.tsx` | 見出しの名前を「その日の予約」に（2か所）。ログインした後のページが SSE を開く（2.3節）ので、`beforeEach` で `vi.stubGlobal('EventSource', …)` の偽物を入れる（jsdom には `EventSource` が無い） |
| `e2e/auth-flow.spec.ts`  | 見出しの名前を「その日の予約」に（1か所）                                                                                                                                                        |

名前で探すテストは、名前を変えると落ちます。変える前に `grep -rn "会議室の予約" web/test e2e` で、どこが使っているかを探しておくと慌てません。

ブラウザで http://localhost:5174 を開き、登録してログインすると、「会議室がまだありません」が出ます。ここで、第68章の `grant-admin` を、登録したメールアドレスで動かしておきます。

```sh
$ npm run grant-admin -- alice@example.com
…
alice@example.com を admin にしました
```

会議室を足すページは6節で作ります。それまでは、表のページは「会議室がまだありません」のままです。

## 4. 予約するとメール

### 4.1 手を動かす: 予約のダイアログ

空きの枠を押すと、`web/src/components/BookingDialog.tsx` を開きます。会議室と始まりは押した枠で決まり、題名と長さだけを選びます（`docs/screens.md` の「予約する」）。`<dialog>` と `showModal` は第8部 第45章 6節の書き方です。

長さは、30 分から 3 時間までのうち、21:00 までに終わるものだけを出します。

```tsx
/** 選べる長さ（30 分〜3 時間）。21:00 を過ぎるものは出さない */
function lengthsFrom(slot: Slot): number[] {
  const start = tokyoParts(slot.start).minutes;
  const out: number[] = [];
  for (let m = RULES.minMinutes; m <= RULES.maxMinutes && start + m <= RULES.closeMinutes; m += RULES.slotMinutes)
    out.push(m);
  return out;
}
```

送る前に、題名を `BookingInputSchema` で、時刻を API と同じ `checkBookingTime` で確かめます。API が断ったときは、理由を出し分けます。

```tsx
        onError: (err) => {
          // 422 は項目ごとに。題名のほかの項目（時刻）の理由は、上にまとめて出す
          if (err instanceof ApiError && err.status === 422) {
            const fields = toFieldErrors(err.problem);
            setErrors(fields['title'] !== undefined ? { title: fields['title'] } : {});
            const other = Object.entries(fields).find(([k]) => k !== 'title');
            setAlert(other?.[1] ?? null);
          } else setAlert(errorMessage(err)); // 409（重なった・10 件まで・停止した会議室）など
        },
```

| 応答 | 画面                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------- |
| 201  | ダイアログを閉じ、「会議室B 14:00〜15:30 を予約しました」と知らせる（`role="status"`。第8部 第45章 5節） |
| 422  | 題名の理由は題名の欄の下に。時刻の理由は、ダイアログの上（`role="alert"`）                               |
| 409  | ダイアログの上に理由（「その時間は、ほかの予約と重なっています」など）。ダイアログは閉じない             |

送る前に確かめていても、409 は起きます。ダイアログを開いてから「予約する」を押すまでの間に、ほかの人が同じ枠を予約するかもしれないからです。API がいつも最後に決めます。

### 4.2 手を動かす: 管理者が取り消したらメール

管理者が、ほかの人の予約を取り消すことがあります（R9）。予約した人は気づかないので、メールで知らせます。メールの中身は、純粋な関数にしておくとテストが楽です。`src/services/booking-mails.ts` を作ります。

```ts
/** '12/10 10:00〜11:00 会議室A「定例」' */
export function describe(b: MailBooking): string {
  const s = tokyoParts(b.startsAt);
  const e = tokyoParts(b.endsAt);
  const [, m, d] = s.date.split('-');
  return `${Number(m)}/${Number(d)} ${hhmm(s.minutes)}〜${hhmm(e.minutes)} ${b.roomName}「${b.title}」`;
}
```

`canceledByAdminMail(to, b, appUrl)` が、件名「予約が取り消されました」と本文を返します。サービスの `cancel` は、取り消した人が予約した人でないときに `onCanceledByOther(b)` を呼び、`server.ts` がその人のメールアドレスを読んで、土台の `deliver`（仕事の列に入れる。第12部 第64章）に渡します。サービスは、メールのことも知りません。

### 4.3 手を動かす: 前日のリマインド

毎日 18:00（日本の時刻）に、翌日の予約がある人へ、1人1通ずつメールを送ります。仕事は2回動くことがあります（再試行や、ワーカーが2台。第12部 第64章 4節）。2回動いても2通目を送らないように、送った記録の表を作ります。`migrations/004_reminder_log.sql` です。

```sql
CREATE TABLE reminder_log (
  user_id integer     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day     date        NOT NULL, -- 予約の日（日本の日付）
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
```

`src/jobs/reminders.ts` の `sendReminders` は、人ごとに、トランザクションの中で「記録を入れる → 送る → 確定」の順にします。

```ts
  // 人ごとにまとめる
  const byUser = Map.groupBy(rows, (r) => r.user_id);
  for (const [userId, list] of byUser) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query('INSERT INTO reminder_log (user_id, day) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
        userId,
        day,
      ]);
      if (r.rowCount === 0) {
        skipped++; // もう送ってある（ほかのワーカーか、前の回）
        await client.query('ROLLBACK');
        continue;
      }
      // …その人の予約を1通にまとめて送る
      await mailer.send(reminderMail(first.email, day, bookings, appUrl));
      await client.query('COMMIT'); // 送れてから、記録を確定する
```

| 書き方                    | 意味                                                                         |
| ------------------------- | ---------------------------------------------------------------------------- |
| `Map.groupBy(配列, 関数)` | 関数が返す値ごとに、配列を `Map` に分ける（Node.js 21 から）。ここでは人ごと |
| `ON CONFLICT DO NOTHING`  | 同じ (user_id, day) があれば、入れずに 0 行（第6部 第32章）                  |
| 送れてから `COMMIT`       | 送れなかったら `ROLLBACK` で記録も消え、再試行のときに、まだの人にだけ送る   |

送れたのに `COMMIT` の前にプロセスが落ちると、記録が消えて2通目が送られます。「ちょうど1回」は作れないので、「2通届くことはまれにある。1通も届かないよりよい」と決め、`docs/data.md` の「決めたこと」に書き足しておきます。

ワーカーは、起動したときに、決まった時刻の仕事を登録します（第12部 第64章 6節）。時刻は設定の `REMINDER_CRON`（既定 `'0 18 * * *'`）で、`tz: 'Asia/Tokyo'` を付けて日本の時刻で数えます。サーバの時計が UTC でも、18:00 は日本の 18:00 です。

```sh
$ node --test test/unit/reminders.test.ts
✔ describe: 日本の時刻で、月/日 時刻〜時刻 会議室「題名」
✔ reminderMail: 件名に日付。予約を1行ずつ。取り消しのページへのリンク
✔ canceledByAdminMail
✔ tomorrowOf: 日本の日付の次の日（UTC では前の日の 15:00 から）
ℹ tests 4
ℹ pass 4
ℹ fail 0
$ node --test --test-name-pattern="メール|リマインド" test/http/realtime.test.ts
✔ 3. 管理者がほかの人の予約を取り消すと、予約した人にメールが届く。自分で取り消したときは届かない
✔ 4. リマインド: 翌日の予約がある人に1通ずつ。2回動いても、2通目は送らない
```

## 5. 自分の予約

### 5.1 手を動かす: 一覧と、確かめてから取り消す

`web/src/pages/MyBookingsPage.tsx` を作り、`routes.tsx` に `{ path: 'mine', element: <MyBookingsPage /> }`、`Layout.tsx` のメニューに「自分の予約」のリンクを足します。1行は「12/10（木） 10:00〜11:00 会議室A 「定例」」の形です。

```tsx
              {when(b)} 「{b.title}」{' '}
              {new Date(b.startsAt).getTime() <= now.getTime() ? (
                <span className="muted">（使用中）</span>
              ) : (
                <button
                  type="button"
                  className="danger"
                  onClick={() => setTarget(b)}
                  aria-label={`「${b.title}」を取り消す`}
                >
                  取り消す
                </button>
              )}
```

始まった予約は取り消せない（R9）ので、ボタンの代わりに「（使用中）」を出します。取り消しは戻せない操作なので、土台の `ConfirmDialog`（第8部 第45章 6節）で「予約を取り消しますか？」と確かめてから送ります。どの予約のボタンかが分かるように、名前に題名を入れます（「「定例」を取り消す」）。

## 6. 管理者のページ

### 6.1 手を動かす: 管理者だけのページの枠

`web/src/components/RequireAdmin.tsx` を作ります。`RequireLogin` の中に置くので、ログインしている前提です。

```tsx
export function RequireAdmin(): ReactNode {
  const me = useMe();
  if (me.data?.role !== 'admin')
    return (
      <>
        <PageTitle>管理者だけのページ</PageTitle>
        <p>このページは管理者だけが使えます。</p>
      </>
    );
  return <Outlet />;
}
```

`routes.tsx` では、`path` の無いルートで包みます（第8部 第44章）。メニューの「会議室の管理」も、管理者のときだけ出します。

```tsx
          { element: <RequireAdmin />, children: [{ path: 'admin/rooms', element: <RoomsAdminPage /> }] },
```

画面で隠すのは使いやすさのためです。メンバーが URL を打って開いても、API が 403 を返します（第68章 2.3節）。

### 6.2 手を動かす: 会議室の管理のページ

`web/src/pages/RoomsAdminPage.tsx` は、会議室の表（行ごとに名前・定員・使えるかを変えて「保存」）と、下の「会議室を足す」のフォームです。全体は [solutions/app/web/src/pages/RoomsAdminPage.tsx](solutions/app/web/src/pages/RoomsAdminPage.tsx) にあります。

| 部品                       | 名前（テストで探す名前）                                   |
| -------------------------- | ---------------------------------------------------------- |
| 名前の欄                   | 「会議室A の名前」                                         |
| 定員の欄                   | 「会議室A の定員」                                         |
| 使えるかのチェックボックス | 「会議室A を使える」                                       |
| 保存のボタン               | 「会議室A を保存」                                         |
| 足すフォーム               | 見出し「会議室を足す」、欄「名前」「定員」、ボタン「足す」 |

一覧は `useRooms({ all: true })`（`?all=1`）で、停止した会議室も出します。名前が重なれば、API の 409 を名前の欄の下に出します。

ブラウザで会議室を2つ足し、別のブラウザ（か、シークレットウィンドウ）で bob として登録してログインし、同じ日の表を並べてみてください。alice が予約すると、bob の表にも出ます。

## 7. 画面のテスト

### 7.1 手を動かす: 偽の API に会議室と予約を足す

画面のテストは、土台と同じく、偽の API（`web/test/fake-api.ts`）を相手にします（第11部 第58章）。会議室と予約の道を足します。本物の決まりを全部まねする必要はなく、画面のテストで使うもの（一覧・作る・重なれば 409・取り消す・会議室の管理）だけです。

```ts
  // 追加（第69章）: 会議室と予約。本物の API の決まりのうち、画面のテストに要るものだけ
  function roomsAndBookings(me: Account, method: string, url: URL, body: unknown): Response {
```

全体は [solutions/app/web/test/fake-api.ts](solutions/app/web/test/fake-api.ts) です。アカウントは alice（1）・bob（2）・carol（3。未確認）・admin（4）、会議室は会議室A（6人）・会議室B（4人）・旧会議室（停止）です。

### 7.2 手を動かす: 「今」と EventSource を決めてテストする

`web/test/booking.test.tsx` では、2つのものをテストの側で決めます。

```tsx
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); // Date だけを止める（「今」を決める）
  vi.setSystemTime(new Date('2026-12-10T00:00:00Z')); // 日本では 12月10日（木）9:00
  vi.stubGlobal('EventSource', FakeEventSource);
  // …
});
```

| 決めるもの            | 理由                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 「今」（`Date` だけ） | 表の「過ぎた枠」が、テストを動かす時刻で変わらないように。`setTimeout` などは本物のまま（Testing Library の待ちが動くように） |
| `EventSource`         | jsdom には無い。偽物は、テストから `emit('booking.created')` で知らせを送れる                                                 |

知らせのテストは、ほかの人の予約を偽の API に足してから、知らせを送り、表に出ることを確かめます。

```sh
$ (cd web && npx vitest run test/booking.test.tsx --reporter verbose)
 ✓ … > その日の予約（/） > 会議室 × 30 分の表。自分の予約には「（自分）」、ほかの人の予約は題名だけ。止めた会議室は出さない
 ✓ … > その日の予約（/） > 空きを押して、題名と長さを選んで予約する。表に出て、知らせる
 ✓ … > その日の予約（/） > 題名が空なら送らずに、その欄に理由を出す
 ✓ … > その日の予約（/） > 重なったら（409）、ダイアログの中に理由を出す。ダイアログは閉じない
 ✓ … > その日の予約（/） > 長さは 21:00 までに終わるものだけ。キャンセルで閉じる
 ✓ … > その日の予約（/） > 前の日・次の日・今日。日付は URL に持つ。正しくない ?date= は今日
 ✓ … > その日の予約（/） > SSE で知らせが来たら、表を読み直す（ほかの人の予約が出る）
 ✓ … > 自分の予約（/mine） > 自分の予約だけを出す。確かめてから取り消す
 ✓ … > 会議室の管理（/admin/rooms） > 管理者でなければ、メニューに出さず、開いても使えない
 ✓ … > 会議室の管理（/admin/rooms） > 管理者は、止めた会議室も含めて一覧し、足す・変えるができる
```

`--reporter verbose` は、テストの名前を1つずつ表示するオプションです（`…` は、ファイルの名前を省いたところ）。

## 8. 2つのブラウザで確かめる（E2E）

### 8.1 手を動かす: 通しの流れを書く

`docs/plan.md` の終わりの確かめは「2つのブラウザで、片方の予約がもう片方に出る」でした。Playwright で、人ごとに別のブラウザのコンテキスト（Cookie が別）を開きます（第11部 第58章 8節）。`e2e/booking-flow.spec.ts` です。

```ts
// 人ごとに別のブラウザのコンテキスト（Cookie が別）を開く
const newPage = async () => (await browser.newContext()).newPage();
const adminPage = await newPage();
const alicePage = await newPage();
const bobPage = await newPage();
// …
// alice が 10:00 から 1 時間、予約する
await alicePage.getByRole('button', { name: '会議室A 10:00 から予約' }).click();
const dialog = alicePage.getByRole('dialog');
await dialog.getByLabel('題名').fill('定例');
await dialog.getByRole('button', { name: '予約する' }).click();
await expect(alicePage.getByRole('cell', { name: '定例（自分）' })).toBeVisible();

// bob の画面にも、読み直さずに出る（SSE の知らせ → 表を読み直す）。bob には「（自分）」が付かない
await expect(bobPage.getByRole('cell', { name: '定例', exact: true })).toBeVisible();
```

| 書き方                                             | 意味                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `browser.newContext()`                             | Cookie もキャッシュも別の、新しいブラウザの窓。3人を1つのテストで動かせる                   |
| `getByRole('cell', { name: '定例', exact: true })` | 表のセルを名前で探す。`exact: true` で「定例（自分）」には合わせない                        |
| `toBeVisible()`                                    | 見えるまで待つ（既定は 5 秒まで）。bob の画面は読み直さないので、SSE が届かなければ失敗する |

表は「明日」を開きます。今日だと、テストを動かす時刻によっては 10:00 の枠が過ぎていて、ボタンが無いからです。準備（登録と管理者にする）は、`e2e/helpers.ts` の `signUpByApi`・`grantAdmin`（`scripts/grant-admin.ts` を動かす）で、画面を通さずにします。

```sh
$ npm run e2e
  ✓  1 [chromium] › e2e/auth-flow.spec.ts:8:1 › 登録 → 確認のメールのリンク → ログイン → ログアウト (1.1s)
  ✓  2 [chromium] › e2e/booking-flow.spec.ts:6:1 › 管理者が会議室を足し、alice の予約と取り消しが bob の画面に届く (2.8s)

  2 passed (10.0s)
```

## 9. 確かめて、コミットする

### 9.1 手を動かす: 全部を通してコミットする

```sh
$ npm run check
…
ℹ tests 90
ℹ pass 90
ℹ fail 0
$ (cd web && npm run check)
…
      Tests  24 passed (24)
$ npm run e2e
  2 passed
$ git add -A
$ git commit -m "第69章 実装（後半）画面・SSE の知らせ・メールとリマインド・E2E"
```

| 数      | 内訳                                                                   |
| ------- | ---------------------------------------------------------------------- |
| API 90  | 第68章の 82、メールの中身の単体 4、知らせ・メール・リマインドの HTTP 4 |
| 画面 24 | 土台の 14、予約の画面 10                                               |
| E2E 2   | 土台の 1、予約の通しの流れ 1                                           |

`docs/plan.md` の「終わりの確かめ」と、`docs/requirements.md` のユーザーストーリーを1つずつ見て、どのテストが確かめているかを確かめてください。確かめていないものが残っていたら、それは第70章の振り返りに書くことです。

## まとめ

- API の純粋な決まり（`domain/`）は、画面にコピーして、送る前の確かめと表示に使う。守っているのは API なので、画面の確かめは使いやすさのため
- 予約が変わったら、キャッシュのキーの頭（`['bookings']`）で全部を古くする。どれを読み直すかは TanStack Query に任せる
- 知らせ（SSE）には中身を入れず、「変わった」だけを送る。受け取った画面は API から読み直すので、見てよいものだけが出る
- 「今」は state に持ち、テストでは `Date` だけを止める
- 2回動くかもしれない仕事は、記録の表の主キーと `ON CONFLICT DO NOTHING` で、1回分だけにする。送れてから記録を確定する
- 名前（`aria-label`・見出し・ボタンの文字）を設計で決め、画面のテストと E2E で、その名前で探す
- 2つのブラウザのコンテキストで、リアルタイムの機能を通しで確かめる

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4・応用2・発展2）。

## 参考資料

- MDN「Server-sent events」（`EventSource`）: https://developer.mozilla.org/ja/docs/Web/API/Server-sent_events
- MDN「Map.groupBy()」: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map/groupBy
- MDN「<td>」（`rowspan`）・「<caption>」: https://developer.mozilla.org/ja/docs/Web/HTML/Element/td
- TanStack Query「Query Invalidation」: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
- BullMQ「Job Schedulers」: https://docs.bullmq.io/guide/job-schedulers
- Playwright「Isolation」（ブラウザのコンテキスト）: https://playwright.dev/docs/browser-contexts

---

前: [第68章 実装（前半）](../ch68-implementation-api/README.md) ／ 次: [第70章 公開と振り返り](../ch70-release-retro/README.md)
