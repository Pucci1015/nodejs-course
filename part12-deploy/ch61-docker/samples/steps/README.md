# 第61章 本文の途中の Dockerfile

本文で、少しずつ直していく途中の Dockerfile です。完成形は [../app/Dockerfile](../app/Dockerfile) です。どれも、`app/` のフォルダで `docker build -f ../steps/Dockerfile.v1 -t ch61-app:v1 .` のように、`-f` で指定して使います（`-f` は、使う Dockerfile を指定するオプション）。

| ファイル | 本文の節 | 中身 |
| --- | --- | --- |
| [Dockerfile.v1](Dockerfile.v1) | 2.2 | 最初の形。`COPY . .` の後に `npm ci` |
| [Dockerfile.v2](Dockerfile.v2) | 3.1 | `package.json` を先にコピーして、`npm ci` の層を使い回す |
| [Dockerfile.shell](Dockerfile.shell) | 5.1 | シェルの形の `CMD`。`docker stop` に 10 秒かかる |
| [Dockerfile.npm](Dockerfile.npm) | 5.1 | `CMD ["npm", "start"]`。止めるときに npm がエラーを出す |
| [Dockerfile.secret](Dockerfile.secret) | 7 | やってはいけない例。`ARG`・`ENV` の秘密の値が `docker history` で見える |
