# 第7部 TypeScript

第6部までのタスク管理 API は、JavaScript で書いてきました。項目の名前の打ち間違いや、`undefined` かもしれない値の使い忘れには、動かすまで気づけません。この部では、JavaScript に**型**を書き足した言語、**TypeScript** を学びます。型の基本から始め、型を組み合わせて「ありえない状態」を書けなくする方法、Node.js と Express での使い方、そして「型は実行時には無い」ので外から来るデータを Zod で確かめる方法までを学び、成果物で API を TypeScript に書き換えます。

| 章 | 内容 | 目安 |
| --- | --- | --- |
| [第35章 TypeScript の基礎](ch35-ts-basics/README.md) | `node` で `.ts` を動かす、`tsc` で確かめる、基本の型と推論、関数とオブジェクトの型、`undefined`・`null`、`any`・`unknown`・`as`、リテラル型とユニオン、`tsconfig.json` | 5〜6時間 |
| [第36章 型の表現力](ch36-ts-types/README.md) | 絞り込み、判別できるユニオン、型ガード、ジェネリクス、ユーティリティ型、Result 型、`as const`・`keyof typeof`・`satisfies`、クラスと型 | 5〜6時間 |
| [第37章 Node.js プロジェクトでの TypeScript](ch37-ts-node/README.md) | 型の除去・tsx・`tsc` のビルド、`@types`、Node.js の API の型、データの層の `interface`、Express の型と宣言のマージ、ESLint（typescript-eslint）、`npm run check` | 6〜7時間 |
| [第38章 型と実行時の境界](ch38-ts-runtime/README.md) | `as` は何も確かめない、Zod のスキーマから型を作る、Express・外のサービス・環境変数の境界で確かめる、条件型、ブランド型、JSON Schema | 5〜6時間 |
| [成果物 タスク管理 API を TypeScript に](project-task-api/README.md) | 第6部の API を、動きを変えずに TypeScript にする。層の間の形を `interface` に、外から来るものは Zod で、`npm run check` をエラー 0 に | 6〜10時間 |

## 準備

第7部のサンプルと練習問題は、外部のパッケージ（typescript・eslint・zod など）を使います。第5・6部と同じく、**第7部のフォルダを `~/dev/part07` にコピーし、そこで動かします**。第35章の最初に、次を1回だけ実行します。

```sh
$ bash （ここに Finder から part07-typescript フォルダの中の setup-part07.sh をドラッグ）
```

- `~/dev/part07` が作られ、`npm ci` でパッケージが入ります。終わったら `cd ~/dev/part07/ch35-ts-basics` で第35章のフォルダに移ります
- [setup-part07.sh](setup-part07.sh) は、作成先（既定 `~/dev/part07`）が既にあれば、何もせずに終わります。作り直すときは、別の名前を指定するか、中身を確かめてから自分で消してください
- 入るパッケージとバージョンは [package.json](package.json) と [package-lock.json](package-lock.json) のとおりです（typescript 6.0.3、@types/node 24.19.2、@types/express 5.0.6、@types/pg 8.23.1、eslint 10.13.0、typescript-eslint 8.72.1、tsx 4.23.15、zod 4.6.7、express 5.3.0、pg 8.23.1、pino 10.4.0）
- 型の設定は、部の直下の [tsconfig.base.json](tsconfig.base.json) にまとめ、章や問題のフォルダの `tsconfig.json` は、それを `extends` で読みます。ESLint の設定は [eslint.config.js](eslint.config.js) です（第37章 6節）
- PostgreSQL は、第6部のもの（`~/dev/part06` で `docker compose up -d --wait`）を使います。使うのは、第37章 4.3節と成果物だけです
- 成果物は、第6部までで作った `~/dev/task-api` で、新しいブランチを作って進めます（[project-task-api/README.md](project-task-api/README.md) の1節）

## 各章の使い方

第1〜6部と同じ構成です。

| 場所 | 中身 |
| --- | --- |
| `README.md` | 本文。番号の付いた節（1, 2, 3, …）に分かれている。「手を動かす」の節で、ファイルを自分で書いて動かす |
| `samples/` | 「手を動かす」で書くプログラムの完成形（`samples/README.md` に一覧と動かし方） |
| `exercises/` | 練習問題（`README.md`）と、問題で使うファイル |
| `solutions/` | 模範解答（`README.md`）と、解答のファイル |

- 練習問題の多くは、**テスト**（`node --test ○○.test.ts`）で確かめます。テストは、動きだけでなく型も確かめます（「型: tsc のエラーが無い」というテストが、`○○.ts` と `○○.check.ts` を tsc で確かめる。第35章 9節）。最初はほとんど失敗し、すべて成功すれば完成です。模範解答は `MODULE=../solutions/○○.ts node --test ○○.test.ts` で確かめられます
- `.ts` のファイルは、ビルドせずに `node ○○.ts` で動かします（Node.js の型の除去。第35章 1節）。型を確かめるのは `npx tsc` です。**`node` は型が間違っていても動かす**ので、動いたからといって型が正しいとは限りません
- サーバは `127.0.0.1` だけで待ち受けます。ポートは章ごとに分けています: 第37章 9470〜9479、第38章 9480〜9489、成果物 9490（テストは 9491・9492）。第35・36章はサーバを使いません
- パスワードなどの値は、`dev-only-…` で始まる、この Mac の中だけで使う開発用の仮のものです。本番では使いません（第12部 第60章）
- Node.js は、第1部 第2章で mise を使って入れたものを使います。この部は Node.js 24 以降を前提にしています（`.ts` を型の除去でそのまま動かすため）
- Python と比べる説明では、まず Python の型ヒント・mypy・pydantic が何をしてくれていたのかを説明してから、TypeScript で同じことを書きます

## 第7部を終えたときにできること

- `tsc` のエラーを読み、型の間違いを動かす前に直せる。推論に任せる所と、型を書く所を区別できる
- `undefined`・`null` かもしれない値、`unknown` の値を、絞り込んでから安全に使える
- 判別できるユニオン・ジェネリクス・ユーティリティ型・`satisfies` で、「ありえない状態」や「書き忘れ」を `tsc` に見つけさせられる
- Express のハンドラ・ミドルウェア、データの層に型を付け、層と層の間の形を `interface` で決められる
- ESLint で、待ち忘れた Promise など、`tsc` では見つからない間違いを見つけられる
- 「型は実行時には無い」ことを説明でき、外から来るデータ（ボディ・クエリ・環境変数・ほかのサービスの応答）を Zod で確かめてから使える
- 動いている JavaScript のプロジェクトを、少しずつ TypeScript に移せる

## 第7部で作るもの

- 型を付けた関数・オブジェクト、`undefined` を扱う関数、状態をリテラル型で表す関数、JavaScript から移したファイル、タスクのファイルを読む CLI（第35章）
- 絞り込み、タスクのイベントのユニオン、ジェネリクスの関数、Task から作る型、型ガード、Result 型、型の付いたイベントエミッタ（第36章）
- 型を付けたプログラム、環境変数の設定、型の付いた Express のルータ、メモリと PostgreSQL のリポジトリ、ESLint で直したバグ、型の付いた API（第37章）
- タスクのスキーマ、Zod で読む環境変数、クエリの確かめ、ZodError を problem+json にする関数、型の付いたハンドラを作る `route`、応答を確かめるクライアント、Zod で書く API（第38章）
- タスク管理 API の TypeScript 版（成果物）

---

教材全体の目次: [../README.md](../README.md) ／ 前: [第6部 データベース](../part06-database/README.md) ／ 次: [第8部 フロントエンドと React](../part08-react/README.md)
