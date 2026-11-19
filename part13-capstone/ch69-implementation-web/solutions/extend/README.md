# extend（問題7の模範解答）

問題7（自分の予約を日付ごとに分ける）で書き換えた、画面のファイルです。第69章を終えたときのアプリ（[../app/](../app/)）からの違いには、`// 追加（練習問題7）:`・`// 変更（練習問題7）:` の印を付けました。

| ファイル                                                             | 変えたところ                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [web/src/pages/MyBookingsPage.tsx](web/src/pages/MyBookingsPage.tsx) | 日本の日付ごとに `h2` と `ul`（名前は `aria-labelledby` で見出し）。行から日付を外した |

あわせて、`web/test/booking.test.tsx` の「自分の予約（/mine）」のテストの1行を、新しい仕様に合わせて直します（行に日付を書かなくなったため）。

```ts
expect(item.textContent).toContain('10:00〜11:00 会議室A 「定例」');
```

試すときは、`~/dev/room-booking` のブランチで、ファイルを置き換えます。

```sh
$ cp ~/dev/part13/ch69-implementation-web/solutions/extend/web/src/pages/MyBookingsPage.tsx ~/dev/room-booking/web/src/pages/
```
