# 第61章 練習問題4: 考えて答える

本文を読み返しながら、次の問いに答えてください。Docker で試せるものは、試して確かめてもかまいません。答えは [../solutions/README.md](../solutions/README.md) の問題4にあります。

## 問1

本文 2.3節で、コンテナの中のアプリが `HOST=127.0.0.1`（既定）で待っていると、`docker run -p 127.0.0.1:9817:9817` で起動しても、Mac の `curl` が `Connection reset by peer` になりました。では、`docker run -p 9817:9817 -e HOST=0.0.0.0`（`127.0.0.1:` を付けない）で起動すると、何が変わりますか。カフェの Wi-Fi につないでいるときに、困ることは何ですか。

## 問2

本文 3.1節の [Dockerfile.v2](../samples/steps/Dockerfile.v2) で、次の3つを1つずつ行い、そのたびに `docker build` しました。それぞれ、どの命令から先が作り直されますか（`CACHED` にならないのは、どれからですか）。

1. `src/server.ts` の1行を変えた
2. `npm install --save zod` でパッケージを1つ足した（`package.json` と `package-lock.json` が変わる）
3. 何も変えずに、もう一度 `docker build` した

## 問3

ある人が、`.dockerignore` を作らずに、Mac で `npm install` したフォルダで `docker build` しました。Dockerfile は [Dockerfile.v1](../samples/steps/Dockerfile.v1) です（`COPY . .` の後に `npm ci`）。このとき、何が起きるでしょうか。`npm ci` が「`node_modules` を消してから入れ直す」ことを思い出して答えてください。また、`npm ci` を `npm install` にしていたら、どんな困ったことが起きえますか。

## 問4

本文 5節の表で、`CMD node src/server.ts`（シェルの形）のコンテナを `docker stop` すると、10 秒かかって終了コード 137 になりました。137 は何を表していますか（ヒント: 128 + シグナルの番号。第3部 第16章）。このとき、アプリの処理中のリクエストや、データベースのプールはどうなりましたか。

## 問5

本文 8節で、Apple Silicon の Mac で作ったイメージ（`linux/arm64`）を、そのまま `linux/amd64` のサーバで動かそうとすると、どうなりますか。また、このアプリの依存パッケージ（express・pg・redis）が、もし C++ で書かれた部分を持つパッケージ（ネイティブアドオン）だったら、`.dockerignore` に `node_modules` を書き忘れたときに何が起きますか。

## 問6

`HEALTHCHECK` を付けたイメージを、`docker run -d` で起動しました。アプリは起動したものの、`/healthz` を返すルートの書き間違いで、いつも 404 を返します。`docker ps` の STATUS はどうなりますか。Docker は、このコンテナを起動し直しますか。
