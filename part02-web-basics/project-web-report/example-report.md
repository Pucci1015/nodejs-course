# 見本: www.shop.example の通信を調べる

> **これは書き方を示すための見本です。** `www.shop.example` は架空のサイトで、IP アドレスは説明用に予約された範囲（`192.0.2.0/24`、`2001:db8::/32`）、数字は「よくある大きさ」を想定して作ったものです。実在するサイトの結果ではありません。自分のレポートでは、実際に調べた結果を書いてください。

- 調べた URL: `https://www.shop.example/`
- 調べた日時: 2026-11-04 21:00
- 調べた場所: 自宅の Wi-Fi（光回線）
- 使った道具: macOS、curl、Node.js、Chrome（いずれも見本を作った時点の版）

## 0. 調べる前の予想

- 大きなショッピングサイトなので、CDN を使っていて、HTTP/2 か HTTP/3 で話しているはず
- 商品の情報は検索エンジンに載せたいので、最初の HTML に内容がある（SSR）のではないか
- Cookie はたくさんありそう

## 1. 全体の図

```
 ブラウザ（自宅の Mac）
   │ ① DNS: www.shop.example → CNAME shop.cdn.example.net → 192.0.2.10（TTL 60秒）
   │ ② HTTPS（HTTP/2）で 192.0.2.10:443 に接続
   ▼
 CDN（cdn.example.net。Via・X-Cache ヘッダで分かる）
   │  HTML はキャッシュせず、毎回奥へ取りに行く（Cache-Control: private, no-cache）
   │  CSS・JS・画像はキャッシュから返す（X-Cache: HIT、Age: 51234）
   ▼
 元のサーバ（Server ヘッダは隠されていて、何で動いているかは分からない）
   │
   ▼
 （データベースなど。外からは見えない）
```

## 2. 時間の流れ

| 段階 | 累計（秒） | この段階にかかった時間（秒） | 説明 |
| --- | --- | --- | --- |
| DNS | 0.012 | 0.012 | 2回目の実行だったので、リゾルバのキャッシュから返ってきたと思われる（1回目は 0.048） |
| TCP の接続 | 0.019 | 0.007 | CDN のサーバが近い（往復 7ms ほど） |
| TLS のハンドシェイク | 0.035 | 0.016 | TLS 1.3 なので、往復1回で終わる（第8章4節）。証明書の検証の時間も含む |
| 最初の1バイト | 0.182 | 0.147 | いちばん長い。HTML を CDN ではなく元のサーバで毎回作っているため（7節） |
| 全部を受け取る | 0.214 | 0.032 | HTML は br で 41KB に圧縮されていた |

**分かったこと**: ネットワーク（DNS・TCP・TLS）は合わせて 35ms で、時間の大半は「サーバが HTML を作る時間」でした。速くするなら、回線より、サーバの処理を見直す方が効果がありそうです（第12部 第66章「計測してから改善」）。

## 3. DNS

```
$ dig +noall +answer www.shop.example A
www.shop.example.      300  IN  CNAME  shop.cdn.example.net.
shop.cdn.example.net.   60  IN  A      192.0.2.10
shop.cdn.example.net.   60  IN  A      192.0.2.11
$ dig +noall +answer www.shop.example AAAA
www.shop.example.      300  IN  CNAME  shop.cdn.example.net.
shop.cdn.example.net.   60  IN  AAAA   2001:db8::10
```

- `www.shop.example` は **CNAME** で CDN の名前を指している。サイトの運営者は自分の DNS に「CDN の名前の別名」とだけ書き、どの IP アドレスを返すかは CDN が決めている
- CDN の A レコードは **TTL が 60秒**と短い。CDN が、混み具合や障害に合わせて返す IP アドレスをすぐに変えられるようにするためだと考えられる。CNAME の方は 300秒
- A レコードが2つある。ブラウザはどちらかに接続し、つながらなければもう一方を試す
- IPv6（AAAA）にも対応している。Mac が IPv6 で接続できる回線なら、IPv6 が先に試される（第5章2節）
- ネームサーバは `ns1.dns.example.`、`ns2.dns.example.` の2つ

## 4. HTTP から HTTPS へ

```
$ curl -sS -o /dev/null -D - http://www.shop.example/
HTTP/1.1 301 Moved Permanently
Location: https://www.shop.example/
```

- `http://` で開くと、`301` で `https://` に移される。リダイレクトは1回だけ
- HTTPS のレスポンスに `Strict-Transport-Security: max-age=31536000; includeSubDomains` がある。1年間、このサイトとサブドメインは `http://` で開こうとしても、ブラウザが最初から `https://` に直す（第8章7節）。そのため、2回目からは上の `301` のリクエスト自体が送られない
- `301` は「恒久的な移動」で、POST が GET に変わることがある。トップページへのアクセスはふつう GET なので問題ない（第7章4節）

## 5. 証明書と TLS

| 項目 | 値 |
| --- | --- |
| TLS のバージョン | TLSv1.3（`TLS_AES_128_GCM_SHA256`） |
| ALPN | `h2` |
| 持ち主（CN）と SAN | `shop.example`、SAN に `shop.example`、`*.shop.example` |
| 発行者（認証局） | Example Issuing CA R1（← Example Root CA） |
| 有効期間 | 2026-09-20 〜 2026-12-19（約90日。残り 45日） |
| チェーンの段数 | 3段（サーバの証明書 → 中間 CA → ルート CA） |

- SAN に `*.shop.example`（ワイルドカード）があるので、`www.shop.example` にも使える。ワイルドカードは1段だけなので、`a.b.shop.example` には使えない
- 有効期間が約90日と短い。自動で更新する仕組み（ACME）を使っていると考えられる。最近は、認証局とブラウザの取り決めで、証明書の有効期間がさらに短くなる方向にある
- サーバが送ってくるのは、サーバの証明書と中間 CA の証明書まで。ルート CA の証明書は、macOS（とブラウザ）が最初から持っているもので確かめる（第8章3節）

## 6. HTTP のバージョン

- curl では `HTTP/2`（ALPN で `h2` に決まった）
- レスポンスに `Alt-Svc: h3=":443"; ma=86400` がある。「HTTP/3 でも話せます」という案内で、Chrome の Network タブの Protocol の列では、**1回目は `h2`、再読み込みすると `h3`** になった。ブラウザは、案内を受け取った後の接続から HTTP/3 を使う（第7章9節）
- macOS に入っている curl は（調べた時点では）HTTP/3 に対応していなかったので、`curl --http3` は試せなかった

## 7. レスポンスのヘッダとキャッシュ

| リソース | Content-Type | Cache-Control | ETag / Last-Modified | 圧縮 |
| --- | --- | --- | --- | --- |
| HTML | `text/html; charset=utf-8` | `private, no-cache` | なし | br |
| CSS（`/assets/app.3f9a1c.css`） | `text/css` | `public, max-age=31536000, immutable` | ETag あり | br |
| JavaScript（`/assets/app.8be2d0.js`） | `text/javascript` | `public, max-age=31536000, immutable` | ETag あり | br |
| 画像（`/img/items/1234.webp`） | `image/webp` | `public, max-age=86400` | ETag あり | なし |

- **HTML は `private, no-cache`**: ログインしている人ごとに中身（カートの数など）が違うので、CDN などの共有のキャッシュには保存させず（`private`）、ブラウザにも毎回サーバに確かめさせている（`no-cache`）。そのため、CDN は HTML を毎回元のサーバに取りに行き、2節の「最初の1バイト」が長くなっていた
- **CSS と JS は1年**: ファイル名に `3f9a1c` のような**内容から作った値**が入っている。中身が変われば名前も変わるので、古い名前のファイルは永遠にキャッシュしてよい（`immutable`）。HTML だけを毎回確かめれば、新しい CSS・JS の名前が伝わる。第7章5節で学んだ「キャッシュの破棄（cache busting）」そのもの
- **画像は1日**: 商品の写真は変わることがあるので、少し短い
- CSS に `If-None-Match` を付けて送ると `304 Not Modified` が返った
- `Vary: Accept-Encoding` があるので、CDN は圧縮の方式ごとに別々にキャッシュしている
- `X-Cache: HIT` と `Age: 51234`（約14時間前から CDN にあった）が CSS に付いていた。HTML には `X-Cache: MISS`

## 8. 圧縮

| Accept-Encoding | 受け取ったバイト数 | Content-Encoding |
| --- | --- | --- |
| identity | 298,512 | なし |
| gzip | 52,870 | gzip |
| br | 41,233 | br |

HTML は、圧縮しないと約 290KB でした。gzip で約18%、br で約14% の大きさになっています。第7章6節で試した結果と同じく、br の方が小さくなりました。画像（WebP）は、それ自体が圧縮された形式なので、さらに圧縮はしていません。

## 9. ページの作られ方

- 最初の HTML（curl で取ったもの）に、商品の名前と値段がすでに入っていた → **SSR**
- HTML の最後に `<script type="module" src="/assets/app.8be2d0.js">` と、`<script id="__DATA__" type="application/json">` に商品のデータの JSON が入っていた。JavaScript がこのデータを使って、すでにある HTML にクリックなどの処理を結び付けていると考えられる（**ハイドレーション**。第10章4.2節）
- JavaScript を無効にして開くと、商品の一覧は表示されたが、「カートに入れる」を押しても何も起きなかった
- 検索エンジンや SNS のプレビューのために、最初の HTML に内容を入れていると考えられる（`<meta property="og:image">` もあった）

## 10. ブラウザでの様子

- リクエストの数: 87 / 受け取ったバイト数: 1.9MB / DOMContentLoaded: 0.41秒 / Load: 1.38秒
- 種類ごとの数: HTML 1、CSS 2、JS 9、画像 58、フォント 2、fetch 15
- リクエストを送ったオリジン（6種類）

  | オリジン | 役割（推測） |
  | --- | --- |
  | `https://www.shop.example` | HTML と、`/api/...` の fetch |
  | `https://static.shop.example` | CSS・JS・フォント（別のオリジンなので、フォントには CORS のヘッダが付いていた。第9章5節） |
  | `https://img.shop.example` | 商品の画像 |
  | `https://analytics.example.org` | アクセス解析 |
  | `https://ads.example.com`、`https://ads-cdn.example.com` | 広告 |

- 2回目（Disable cache を外して再読み込み）: 71個がキャッシュから（`(memory cache)` か `(disk cache)`）、HTML と fetch の16個はサーバに送られ、`304` は0個（HTML に ETag が無いため、毎回 `200` で全体を受け取っていた）

## 11. Cookie

| オリジン | Cookie の名前 | Secure | HttpOnly | SameSite | 役割（推測） |
| --- | --- | --- | --- | --- | --- |
| `www.shop.example` | `session_id` | ✓ | ✓ | Lax | ログインの状態（セッション ID。第7章3節） |
| `www.shop.example` | `cart` | ✓ | | Lax | カートの中身の数を JavaScript で表示するため（HttpOnly が無いので JS から読める） |
| `.shop.example` | `_ga_xxxx` | ✓ | | None | アクセス解析 |
| `ads.example.com` | `uid` | ✓ | ✓ | None | 広告（サードパーティの Cookie。`SameSite=None` なので、よそのサイトからのリクエストにも付く） |

- ログインの状態を表す Cookie には `HttpOnly` が付いていて、XSS があっても JavaScript から盗まれにくくなっている（第10部）
- `SameSite=None` の Cookie には、決まりどおり `Secure` が付いていた
- Chrome の設定によっては、サードパーティの Cookie は保存されないことがある

## 12. 予想と違ったこと

- HTML まで CDN でキャッシュしていると思っていたが、`private, no-cache` で毎回元のサーバに取りに行っていた。利用者ごとに中身が違うページは、共有のキャッシュに置けないため
- HTTP/3 は、1回目の接続では使われなかった（Alt-Svc で知ってから使う）
- 画像が58個と、思ったより多かった。画面の外の画像は `loading="lazy"` で、スクロールしてから読み込まれていた

## 13. 分からなかったこと

- 元のサーバが何で動いているか（Node.js か、別の言語か）。`Server` ヘッダが隠されていた。CDN の後ろの構成は、外からは分からない
- `/api/...` の fetch のレスポンスが、どのようにデータベースから作られているか → 第5部・第6部で、自分で作って理解したい
- `__DATA__` の JSON と、ハイドレーションの細かい仕組み → 第8部 第46章
