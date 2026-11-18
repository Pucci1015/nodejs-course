# 第61章 サンプル

本文で使うものの完成形です。うまく動かないときは、自分で書いたものと比べてください。

| ファイル・フォルダ | 本文の節 | 中身 |
| --- | --- | --- |
| [app/](app/) | 2〜9 | コンテナにする小さな API（ポート 9817）。完成形の [Dockerfile](app/Dockerfile)（マルチステージ）と [.dockerignore](app/.dockerignore) 付き |
| [steps/](steps/) | 2.2・3.1・5.1・7 | 本文の途中の Dockerfile（v1・v2・シェルの形・npm start・やってはいけない秘密の値の例） |
| [compose.yaml](compose.yaml) | 9 | `app/` と PostgreSQL を一緒に動かす |
| [tsconfig.json](tsconfig.json) | | このフォルダを `npx tsc` で確かめる設定（`app/` は、`app/` の中の設定で確かめる） |

`app/` は、本文の「読み方」のとおり、章のフォルダに `cp -R samples/app app` でコピーしてから使います。完成形のまま動かすときは、次のようにします。

```sh
$ cd ~/dev/part12/ch61-docker/samples/app
$ docker build -t ch61-app:v3 .
$ docker run --rm -p 127.0.0.1:9817:9817 ch61-app:v3     # 別のターミナルで curl http://127.0.0.1:9817/
$ cd ..
$ docker compose up -d --build --wait                    # curl http://127.0.0.1:9817/readyz
$ docker compose down
```
