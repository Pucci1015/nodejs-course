# 第2部の成果物 Web サイトの通信を調べた図解レポート

第2部のまとめとして、**実在する Web サイトを1つ選び、ブラウザでそのページを開いたときに何が起きているかを、`dig`・`curl`・DevTools で調べて、図と文章で説明するレポート**を作ります。
第5〜10章で学んだことを、自分の手で「本物」に当てはめることが目的です。教材のサンプルは、どれも自分で作った小さなサーバでしたが、本物のサイトには CDN、リダイレクト、HTTP/2・3、キャッシュ、たくさんの Cookie など、教材で学んだものがすべて詰まっています。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 3〜5時間 |
| 前提 | 第5〜10章 |
| 作るもの | Markdown のレポート1つ（図を含む）。GitHub のリポジトリで管理すると、第1部の復習にもなる |

| ファイル | 中身 |
| --- | --- |
| [investigate.sh](investigate.sh) | 調べる材料（DNS、リダイレクト、接続の時間、証明書、ヘッダ、圧縮、キャッシュ、HTTP/3）をまとめて集めるスクリプト |
| [report-template.md](report-template.md) | レポートのひな形 |
| [example-report.md](example-report.md) | レポートの見本（**架空のサイト**で、書き方の例を示したもの） |

> **読み方**
> - 作業は `~/dev/web-report/` で行います（教材のフォルダは見本として残しておくため）。最初に作業フォルダを作り、`investigate.sh` と `report-template.md` をコピーします。
>
>   ```sh
>   $ mkdir -p ~/dev/web-report && cd ~/dev/web-report
>   $ cp （ここに Finder から project-web-report の investigate.sh と report-template.md をドラッグ） .
>   $ git init
>   ```
>
>   `git init` は、このフォルダを Git のリポジトリにするコマンドです（第1部 第3章）。
> - この成果物のコマンドは、すべて `~/dev/web-report/` で実行します。
> - 証明書を調べる所（2.1節の 4）は、第8章でコピーした `~/dev/ch08/samples/cert-inspect.mjs` を使います。第8章を `~/dev/ch08` でやっていないときは、Finder から `ch08-https-tls/samples/cert-inspect.mjs` も `~/dev/web-report` にコピーしてください。

## この成果物で身につくことを、後でどこで使うか

| 身につくこと | 後で使う場面 |
| --- | --- |
| `dig`・`curl -D -`・`curl -w` で、本物のサイトの通信を調べる | 第5部以降で、自分の API やサーバの動きを確かめるとき。第12部で公開したサイトを確かめるとき |
| キャッシュ・圧縮・HSTS・Cookie の属性を読み取る | 第4部 第19章（静的ファイル）、第10部（安全な Cookie）、第12部（CDN と HTTPS） |
| DevTools の Network タブで、リクエストの数・時間・オリジンを数える | 第8部の React の画面、第12部 第66章の性能の計測 |

---

## 1. 調べるサイトを選ぶ

次のようなサイトから、1つ選びます。

- 自分がよく使うサイト（ニュース、ショッピング、SNS、大学や会社のサイトなど）
- 自分が Flask で作って公開したことのあるサイト
- 比べると面白い2つ（大きな会社のサイトと個人のブログ、など。余裕があれば）

守ること:

- 調べるのは、**ふつうのブラウザが1ページを開くのと同じ程度のリクエスト**だけにします。`investigate.sh` は1回で10回ほどのリクエストを送ります。何度も繰り返し実行したり、ログインが必要なページを自動で叩いたり、負荷をかけたりしてはいけません。
- 調べた結果に、**自分の Cookie の値**やログインの情報を書かないでください（`investigate.sh` は Cookie の値を表示しません。DevTools からコピーするときも、値は消します）。
- レポートを GitHub に公開する場合は、そのサイトの人が読んでも困らない書き方にします（「脆弱性を見つけた」ような話は書かず、もし気付いたことがあれば、そのサイトの問い合わせ先に知らせます）。

## 2. 材料を集める

### 2.1 investigate.sh を実行する

`~/dev/web-report` で、調べるホスト名を付けて実行します。

```sh
$ bash investigate.sh www.example.com | tee notes-www.example.com.txt
```

`| tee ファイル名` は、「画面に表示しながら、同じ内容をファイルにも保存する」という意味です。保存したメモは、レポートを書くときに見返します。

スクリプトは、次の8つを調べて、Markdown の形で表示します。

| | 調べること | 使うもの | 章 |
| --- | --- | --- | --- |
| 1 | IP アドレス（A・AAAA）、CNAME、TTL、ネームサーバ | `dig` | 第5章5節 |
| 2 | `http://` で開いたときのリダイレクト | `curl -D -`、`curl -L` | 第7章4節、第8章7節 |
| 3 | 接続した IP アドレス、HTTP のバージョン、DNS・TCP・TLS・最初の1バイトまでの時間 | `curl -w` | 第5章4節、第7章9節 |
| 4 | TLS のバージョン、証明書の持ち主・発行者・SAN・有効期間・チェーン | 第8章の `cert-inspect.mjs` | 第8章3節・6節 |
| 5 | 主なレスポンスのヘッダ（Content-Type、キャッシュ、HSTS、Cookie の属性、CDN の手がかり） | `curl -D -` | 第6〜8章 |
| 6 | 圧縮の有無と、圧縮したときのバイト数 | `curl -H 'Accept-Encoding: ...'` | 第7章6節 |
| 7 | `ETag` や `Last-Modified` を使った条件付きリクエストで `304` が返るか | `curl -H 'If-None-Match: ...'` | 第7章5節 |
| 8 | HTTP/3 の案内（`Alt-Svc`） | | 第7章9節 |

本物のサイトを調べる前に、自分の Mac の中で試しておくと安心です。第8章の証明書（5.1節の `make-self-signed.sh` で `~/dev/ch08/certs` に作ったもの）と、練習問題8で作った `secure-redirect-server.mjs`（HTTP は 8080、HTTPS は 8443）を使います。

```sh
$ node ~/dev/ch08/secure-redirect-server.mjs                                   # ターミナル1
$ CA_FILE=~/dev/ch08/certs/cert.pem bash investigate.sh localhost 8443 8080     # ターミナル2（~/dev/web-report で）
```

`CA_FILE=...` を前に付けると、「この証明書を信頼して調べる」という意味になります（自己署名証明書なので）。練習問題8を作っていないときは、`~/dev/ch08` に教材の `solutions` をコピーして、`node ~/dev/ch08/solutions/secure-redirect-server.mjs` で起動します。

実行した結果の一部です（時間や指紋は毎回変わります）。

```
## 2. HTTP から HTTPS へ（第7章4節、第8章7節）

$ curl -sS -o /dev/null -D - http://localhost:8080/
HTTP/1.1 308 Permanent Redirect
Location: https://localhost:8443/

## 5. レスポンスのヘッダ（第6章、第7章）

HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Strict-Transport-Security: max-age=300
Set-Cookie: sid=（値は省略）; Path=/; Secure; HttpOnly; SameSite=Lax
```

### 2.2 スクリプトでは分からないことを、自分で調べる

`investigate.sh` は「1つの URL に対する HTTP のやり取り」しか見ません。ブラウザでの様子は、Chrome の DevTools で調べます（第7章1節）。

1. 新しいシークレットウィンドウ（`⌘ + ⇧ + N`）を開く（キャッシュと Cookie が無い状態にするため）
2. DevTools の Network タブを開き、「Disable cache」にチェックを入れてから、サイトを開く
3. 次のことを記録する
   - リクエストの数、受け取ったバイト数、`DOMContentLoaded` と `Load` の時間（Network タブの一番下）
   - HTML・CSS・JavaScript・画像・フォント・`fetch` の、それぞれの数（上の絞り込みのボタンで切り替える）
   - 何種類のオリジン（ホスト）にリクエストを送っているか（列の見出しを右クリックして「Domain」を表示する）。それぞれが何のためのものか（CDN、画像、広告、アクセス解析など）
   - `Protocol` の列（右クリックで表示）で、`h2`・`h3`・`http/1.1` のどれか
   - 最初の HTML のレスポンスに、ページの内容が入っているか（SSR か CSR か。第10章4節）。「Disable JavaScript」で開くとどうなるか
   - Application タブの Cookies で、どのオリジンの Cookie が、どの属性（`Secure`・`HttpOnly`・`SameSite`）で保存されたか（**値は書かない**）
4. 「Disable cache」を外して再読み込みし、キャッシュから読まれたもの（Size の列に「(memory cache)」「(disk cache)」）と、`304` になったものを数える

## 3. レポートを書く

「読み方」でコピーした [report-template.md](report-template.md) を、`README.md` という名前でコピーし、それに書いていきます。

```sh
$ cp report-template.md README.md
```

書き方の見本は [example-report.md](example-report.md) にあります。見本は、架空のサイトで書き方を示したものです。数字や名前をそのまま写さず、自分が調べたサイトの結果で書いてください。

レポートに必ず入れるもの:

1. **全体の図**: ブラウザから、DNS・CDN・サーバまで、どこを通ってページが届いたか（第10章1節の図のように、テキストの図で構いません）
2. **時間の流れ**: DNS → TCP → TLS → HTTP の順に、それぞれにかかった時間（2.1 の 3 を使う）
3. **各項目の説明**: 調べた結果を、**なぜそうなっているのか**まで説明する。「`Cache-Control: max-age=0` でした」だけでなく、「HTML は毎回確かめさせ、CSS と JS はファイル名に版を入れて1年キャッシュさせている。更新をすぐ反映させるため」のように
4. **予想と違ったこと**: 調べる前に予想したことと、実際の違い
5. **分からなかったこと**: 調べても分からなかったこと。後の部で分かりそうなら、どの部か

### 評価の目安（自分で確かめる）

- [ ] DNS の結果から、CDN を使っているかどうかを、理由を付けて判断している（CNAME の名前、IP アドレスの持ち主、`Server`・`Via` などのヘッダ）
- [ ] HTTP から HTTPS へのリダイレクトのステータスコードと、HSTS の有無・期間を書き、その意味を説明している
- [ ] 証明書の発行者、有効期間、SAN に入っている名前を書き、チェーンが何段か説明している
- [ ] HTML と、CSS・JS・画像とで、キャッシュの設定の違いを比べている
- [ ] 圧縮の方式と、圧縮によってどのくらい小さくなったかを書いている
- [ ] HTTP のバージョン（1.1・2・3）と、なぜそのバージョンになったかを説明している
- [ ] Cookie の数と属性をまとめ、`Secure`・`HttpOnly`・`SameSite` の意味に触れている（値は書いていない）
- [ ] ページが SSR・CSR・SSG のどれか（または組み合わせ）を、根拠を付けて判断している
- [ ] 図があり、レポートだけを読んだ人が、ページが届くまでの流れを理解できる
- [ ] 調べた日時と、使った道具の版が書いてある（結果は時間とともに変わるため）

## 4. 発展

- 同じサイトを、自宅の Wi-Fi とスマートフォンのテザリングで調べて、DNS の答えの IP アドレスや時間を比べる（CDN は、利用者に近いサーバの IP アドレスを返すことがあります）
- `dig @1.1.1.1` と `dig @8.8.8.8` のように、問い合わせる DNS のリゾルバを変えて比べる
- 2つのサイトを調べて、表にして比べる
- DevTools の Network タブで、ページを開いたときの「ウォーターフォール」（横棒のグラフ）を見て、何が何を待っているか（第9章3節の、スクリプトの読み込み方）を説明する

---

前の章: [第10章 Web アプリの構成パターン](../ch10-web-architecture/README.md) ／ 第2部の目次: [../README.md](../README.md)
