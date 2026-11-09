# 第2部 Web の基礎

Flask でアプリを作っていたときは、`app.run()` を実行してブラウザで開けば動きました。その間に、ネットワーク・DNS・TCP・HTTP・TLS・ブラウザが何をしていたのかを、この部で1つずつ確かめます。
フレームワークは使わず、`curl`・`nc`・`dig`・DevTools と、Node.js の標準機能だけで書いた小さなプログラムで、**通信を自分の目で見る**ことを重視します。第4部でフレームワークなしのサーバを作るときも、第5部で Express を使うときも、ここで学んだことが土台になります。

| 章 | 内容 | 目安 |
| --- | --- | --- |
| [第5章 インターネットの仕組み](ch05-internet/README.md) | 階層、IP アドレスとループバック、ポート、TCP と UDP、DNS と `dig`、`ping` と `traceroute` | 3〜4時間 |
| [第6章 HTTP を手で話す](ch06-http-by-hand/README.md) | `curl -v` と `nc`、リクエストとレスポンスの形、メソッド、ステータスコード、ヘッダ、Content-Length と chunked、keep-alive、`node:http` がしていること | 3〜4時間 |
| [第7章 HTTP の詳細](ch07-http-details/README.md) | DevTools、Content-Type と文字コード、Cookie、リダイレクト、キャッシュ（Cache-Control、ETag）、圧縮、コンテンツネゴシエーション、HTTP/2・3 | 4〜5時間 |
| [第8章 HTTPS と TLS](ch08-https-tls/README.md) | 盗聴・改ざん・なりすまし、ハッシュ・HMAC・共通鍵・公開鍵・署名、証明書と認証局、TLS 1.3、自己署名と mkcert、HSTS と Secure Cookie | 4〜5時間 |
| [第9章 ブラウザの仕組み](ch09-browser/README.md) | URL の構造、URL を入力してから表示されるまで、`defer`・`async`・`module`、同一オリジンポリシー、オリジンとサイト、CORS | 4〜5時間 |
| [第10章 Web アプリの構成パターン](ch10-web-architecture/README.md) | Web アプリの登場人物、MPA と SPA、SSR・CSR・SSG、REST、安全と冪等、PRG パターン、Flask のアプリを説明し直す | 4〜5時間 |
| [成果物 通信の調査レポート](project-web-report/README.md) | 実在のサイトを `dig`・`curl`・DevTools で調べ、ページが届くまでの流れを図解する | 3〜5時間 |

## 各章の使い方

第1部と同じ構成です。

| 場所 | 中身 |
| --- | --- |
| `README.md` | 本文。番号の付いた節（1, 2, 3, …）に分かれている |
| `samples/` | 本文で使うサンプル（`samples/README.md` に一覧と動かし方） |
| `exercises/` | 練習問題（`README.md`）と、問題で使うファイル |
| `solutions/` | 模範解答（`README.md`）と、解答のファイル |

- **実習は `~/dev/` の下で行います。** 教材のフォルダは見本として残しておき、その中でファイルを作ったりコマンドを動かしたりはしません。各章の最初に `~/dev/chNN/` を作り、その章の `samples` と `exercises` をコピーしてから始めます（手順は各章の「読み方」にあります）。
- 本文は「短い説明 → **手を動かす**（打って動かす）」の繰り返しです。練習問題は、そこで書いたコードを広げていく、書く問題が中心です。
- サンプルや練習問題のサーバは、すべて `127.0.0.1`（自分の Mac の中）だけで待ち受けます。章ごとに使うポートの番号を分けているので、他の章のサーバと同時に動かしても、ぶつかりません（各章の `samples/README.md` に書いてあります）。
- 外部のパッケージは使いません。`npm install` は不要で、第1部で入れた Node.js（mise で管理しているもの）だけで動きます。
- サーバを止めるときは、そのターミナルで `Ctrl + C` を押します。「`EADDRINUSE`（アドレスが使用中）」と表示されたら、前に起動したサーバが残っています（`lsof -nP -iTCP:ポート番号 -sTCP:LISTEN` で探せます。第5章3.4節）。
- 証明書や秘密鍵（第8章）は、OneDrive に同期されないよう `~/dev/` の下に作ります。

### この部で使う道具

| 道具 | 確かめ方 | 入っていなければ |
| --- | --- | --- |
| curl | `curl --version` | macOS に最初から入っている |
| nc（netcat） | `nc -h` | macOS に最初から入っている |
| dig | `dig -v` | macOS に最初から入っている |
| openssl | `openssl version` | macOS に最初から入っている（LibreSSL）。第8章のスクリプトは LibreSSL でも動く |
| mkcert（第8章） | `mkcert -version` | `brew install mkcert`（第8章5.3節） |
| Chrome | | https://www.google.com/chrome/ |
| Python と Flask（第10章練習問題7だけ） | `python3 --version` | macOS の `python3`（初回は Command Line Tools のインストールを求められる）。Flask は `~/dev/ch10/.venv` の仮想環境に入れる |

## 第2部を終えたときにできること

- 「ページが開かない」「遅い」「ブラウザでだけ動かない」ときに、DNS・TCP・TLS・HTTP・ブラウザのどの段階の問題かを切り分けられる
- `curl -v` や DevTools で、リクエストとレスポンスのヘッダを読み、意味を説明できる
- 文字化け、リダイレクトのループ、キャッシュが効かない・効きすぎる、Cookie が送られない、といった問題の原因を、ヘッダから探せる
- HTTPS の証明書が「誰が・何を保証しているのか」を説明でき、自分の Mac で HTTPS のサーバを動かせる
- CORS のエラーを読み解き、サーバ側で正しく直せる
- MPA・SPA、SSR・CSR・SSG、REST、冪等性といった言葉を使って、Web アプリの設計を説明できる

## 第2部で作るもの

- 行単位で話す TCP のサーバ、ポートスキャナ（第5章）
- HTTP のクライアント（Content-Length と chunked に対応）、アクセスログを書くサーバ（第6章）
- Cookie の解析、ETag に対応した静的ファイルのサーバ、Accept の解析（第7章）
- 署名付きの値、自分の認証局、証明書の確認ツール（第8章）
- オリジンとサイトの判定、オープンリダイレクトの対策、CORS に対応した API（第9章）
- 自分で書いた MPA と SPA のメモ帳、PRG に直した MPA、冪等キーに対応した API（第10章）
- 実在のサイトの通信を調べたレポート（成果物）

---

教材全体の目次: [../README.md](../README.md) ／ 前: [第1部 Mac の開発環境と道具](../part01-mac-dev-env/README.md) ／ 次: [第3部 モダン JavaScript と Node.js の基礎](../part03-js-node-basics/README.md)
