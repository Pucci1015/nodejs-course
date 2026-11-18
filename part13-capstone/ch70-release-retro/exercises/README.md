# 第70章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part13/ch70-release-retro/exercises/` で行います。最初に `cd ~/dev/part13/ch70-release-retro/exercises` で移動してください。

| 問題 | 種類 | テーマ                                        | 使うファイル                                                                                             | 本文の節 |
| ---- | ---- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------- |
| 1    | 基本 | `/version` で返す版を決める・比べる           | [app-version.ts](app-version.ts)、[app-version.test.ts](app-version.test.ts)                             | 2.2・5.2 |
| 2    | 基本 | CI の穴を埋める                               | [ci.yml](ci.yml)、[ci.test.ts](ci.test.ts)                                                               | 4        |
| 3    | 基本 | render.yaml に、入れ忘れた環境変数が無いか    | [missing-env.ts](missing-env.ts)、[missing-env.test.ts](missing-env.test.ts)                             | 5.1      |
| 4    | 基本 | 考えて答える                                  | [predict.md](predict.md)                                                                                 | 2〜6     |
| 5    | 応用 | 公開したアプリを外から一通り確かめるコマンド  | [smoke.ts](smoke.ts)、[smoke.test.ts](smoke.test.ts)                                                     | 3.3      |
| 6    | 応用 | compose のファイルどうしのポートのぶつかり    | [compose-ports.ts](compose-ports.ts)、[compose-ports.test.ts](compose-ports.test.ts)                     | 3.1      |
| 7    | 発展 | README と docs の、切れたリンクを探すコマンド | [check-links.ts](check-links.ts)、[check-links.test.ts](check-links.test.ts)                             | 7.2      |
| 8    | 発展 | マイグレーションが「足すだけ」か調べる        | [additive-migration.ts](additive-migration.ts)、[additive-migration.test.ts](additive-migration.test.ts) | 6.2      |

**発展**（7・8）は、少し長めの問題です。できなくても、自分のアプリに進んでかまいません。

## テストの使い方

問題4以外は、ファイルを書いて、`node --test ○○.test.ts` ですべてのテストが通れば完成です。模範解答で試すには、`MODULE=../solutions/○○.ts` を付けます（例: `MODULE=../solutions/smoke.ts node --test smoke.test.ts`。問題2は `MODULE=../solutions/ci.yml`）。

- [files/](files/) は、テストが読むファイルです（アプリの `render.yaml`・`compose.yaml`・`compose.prod.yaml`・`migrations/` のコピーと、問題6の例）。書き換えなくてかまいません。
- [typecheck.ts](typecheck.ts) はテストの部品です。どのテストも最後に、書いたファイルに `tsc` のエラーが無いことを確かめます（問題2を除く）。

---

## 基本

### 問題1 `/version` で返す版を決める・比べる

[app-version.ts](app-version.ts) に、2つの関数を書いてください（本文 2.2節・5.2節）。

| 関数                     | 返すもの                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `appVersion(env)`        | `APP_VERSION` → `RENDER_GIT_COMMIT` → `'dev'` の順に、最初に書いてあるもの。空の文字は「書いていない」と同じ            |
| `sameVersion(got, want)` | 2つともコミットの ID（`0-9a-f` だけで 7 文字以上）なら、短いほうが長いほうの頭であれば `true`。それ以外は完全に同じとき |

```sh
$ node --test app-version.test.ts      # 書く前は 3 個が失敗
```

ヒント: `??` は `undefined` と `null` しか飛ばしません。`''` を先に `undefined` にする小さな関数を作ると、`??` でつなげます。コミットの ID かどうかは、正規表現 `/^[0-9a-f]{7,}$/` の `test` で調べます。

### 問題2 CI の穴を埋める

[ci.yml](ci.yml) は、アプリの `.github/workflows/ci.yml` から4か所を消したものです。`# ここを書く` の所を埋めてください（本文 4節）。

- `web` のジョブの `run` を、全部 `web/` の中で動かす
- `web` のキャッシュのキーを、`web/package-lock.json` にする
- `web` の手順に、`npm ci --ignore-scripts`・`npm run check`・`npm audit --omit=dev --audit-level=high` の3つの `run`
- `e2e` は、`api` と `web` の両方が通ってから動く

```sh
$ node --test ci.test.ts               # 書く前は 3 個が失敗
```

テストは、YAML として読んで形を確かめるだけです（本文 4.2節の `show-jobs.ts` と同じ考え方）。インデントがずれると、テストの最初で例外になります。

### 問題3 render.yaml に、入れ忘れた環境変数が無いか

[missing-env.ts](missing-env.ts) に、2つの関数を書いてください（本文 5.1節）。`blueprint` は、`render.yaml` を `yaml` の `parse` で読んだものです。

- `envKeysOf(blueprint, serviceName)`: そのサービスの `envVars` の `key` と、`fromGroup` で挙げたグループの `envVars` の `key` を、重なりなしでアルファベット順に。サービスやグループが無ければ、その名前を入れた文で `Error` を投げる
- `missingEnv(blueprint, serviceName, required)`: `required` のうち、そのサービスに渡らないもの（`required` の順）

```sh
$ node --test missing-env.test.ts      # 書く前は 4 個が失敗
```

ヒント: ファイルの中の `Blueprint`（Zod のスキーマ）で、まず確かめます。`envVars` の1つは `{ key }` か `{ fromGroup }` のどちらかの形なので、`'key' in v` で絞り込みます（第7部 第36章 1節）。重なりを消すには `Set` を使います。

### 問題4 考えて答える

[predict.md](predict.md) の5つの問いに、本文と完成形のアプリを読んで答えてください。手元の本番の形の `NODE_ENV`、ワーカーが app を待つ理由、2つのヘルスチェック、push しただけではデプロイしない理由、列の名前を変えたいとき、を考えます。

## 応用

### 問題5 公開したアプリを外から一通り確かめるコマンド

本文 3.3節で `curl` で確かめた5つを、1つのコマンドにします。[smoke.ts](smoke.ts) の `CHECKS` と `main` を書いてください。

| 道             | 合っているとき                                 |
| -------------- | ---------------------------------------------- |
| `/healthz`     | 200                                            |
| `/readyz`      | 200 で、JSON の `status` が `'ready'`          |
| `/version`     | 200 で、JSON の `version` が空でない文字       |
| `/`            | 200 で、`Content-Type` が `text/html` で始まる |
| `/api/auth/me` | 401                                            |

- 1行ずつ `[OK] /healthz` か `[NG] /readyz: 503（200 のはず）` のように出す（`console.log`）。最後の行は `すべて成功しました`（終了コード 0）か `N 件失敗しました`（1）
- つながらない・5 秒たっても応答が無いときも NG にして、次へ進む（例外で止まらない）
- 引数が URL 1つでなければ、使い方を `console.error` に出して 2。URL の最後に `/` があってもよい

```sh
$ node --test smoke.test.ts            # 書く前は 4 個が失敗
$ node smoke.ts http://127.0.0.1:9913  # compose.prod.yaml を動かしているとき
```

ヒント: 待つときの形は、本文 5.2節でコピーした `scripts/wait-for-version.ts` の `ask` と同じです（`fetch` に `AbortSignal.timeout(5000)`、`try` / `catch`）。JSON の形は、`JSON.parse` してから Zod の `safeParse` で確かめます（`z.object({ status: z.literal('ready') })`）。

### 問題6 compose のファイルどうしのポートのぶつかり

開発の `compose.yaml`、本番の形の `compose.prod.yaml`、そして次に作るアプリの compose を同時に動かすと、Mac のポートがぶつかることがあります（本文 3.1節）。[compose-ports.ts](compose-ports.ts) に2つの関数を書いてください。

- `publishedPorts(file, text)`: compose のファイル（YAML の文字）から、Mac に出しているポートを、書いてある順に。`'IP:Mac:コンテナ'` と `'Mac:コンテナ'`（IP は `'0.0.0.0'`）を読み、コンテナの番号だけのもの（`9229` や `'9229'`）は入れない
- `portConflicts(list)`: Mac の番号が同じで、IP が同じか、どちらかが `'0.0.0.0'` のもの。`{ hostPort, users }`（`users` は `'ファイル サービス'`）を、番号の小さい順に

```sh
$ node --test compose-ports.test.ts    # 書く前は 3 個が失敗
```

ヒント: `'127.0.0.1:9913:9900'.split(':')` は3つ、`'5434:5432'` は2つに分かれます。番号ごとにまとめるのは `Map.groupBy`（第69章 4.3節）です。`127.0.0.1` と `127.0.0.2` は別の IP なので、同じ番号でもぶつかりません。

## 発展

### 問題7 README と docs の、切れたリンクを探すコマンド

本文 7.2節の `list-links.ts` を広げて、行き先が無いリンクを探すコマンドにします。[check-links.ts](check-links.ts) に `findBrokenLinks` と `main` を書いてください。決まりは、ファイルのコメントに全部書いてあります。

- `node_modules` と、`.` で始まるフォルダの中は見ない
- `http:`・`https:`・`mailto:`・`#` で始まる行き先は調べない。`#` から後ろは取り、`%E8%A8%AD…` は元の文字に戻す
- ` ``` ` で囲んだコードのブロックと、`` `…` `` の中は、リンクとみなさない
- 出力は `docs/README.md:12: adr/0002.md が見つかりません`。最後に `切れたリンクはありません`（0）か `N 個のリンクが切れています`（1）。フォルダが無いときは 2

```sh
$ node --test check-links.test.ts      # 書く前は 3 個が失敗
$ node check-links.ts ~/dev/room-booking
```

ヒント: ファイルが有るかは、`fs/promises` の `access` が失敗するか（`then` の2つ目の関数）で分かります。`%XX` を戻す `decodeURIComponent` は、読めない書き方で例外を投げるので、`try` / `catch` で包みます。行の番号は、`text.split('\n').entries()` の番号 + 1 です。

### 問題8 マイグレーションが「足すだけ」か調べる

本文 6.2節の表を、コードにします。[additive-migration.ts](additive-migration.ts) に `checkMigration(sql)` を書き、前の版を壊す書き方を、文（`;` で区切った1つ）の始まりの行と理由で返してください。

| 書き方                                               | 理由（`REASONS`）                            |
| ---------------------------------------------------- | -------------------------------------------- |
| `DROP TABLE`・`DROP COLUMN`                          | `'表や列を消している'`                       |
| `RENAME`                                             | `'名前を変えている'`                         |
| `ALTER COLUMN … TYPE`                                | `'列の型を変えている'`                       |
| `SET NOT NULL`                                       | `'NOT NULL を足している'`                    |
| `ADD COLUMN … NOT NULL`（同じ文に `DEFAULT` が無い） | `'NOT NULL の列を DEFAULT 無しで足している'` |

- 大文字・小文字を区別しない。空白や改行が複数あってもよい
- `--` のコメントと `'…'` の中（`''` は `'` 1つ）は見ない。`;` で区切るときも
- アプリの `migrations/` の 001〜004 は、どれも問題なし

```sh
$ node --test additive-migration.test.ts   # 書く前は 4 個が失敗
```

ヒント: いきなり正規表現で探すと、コメントや文字の中の `DROP TABLE` や `;` に当たってしまいます。先に「コメントと文字の中を空白に置き換えた SQL」を、1文字ずつ見て作ります（今いるのが「ふつう」「コメント」「文字」のどこかを、変数に覚えておく）。改行は残すと、行の番号が変わりません。後は `;` で分けて、それぞれに正規表現（`i` を付けて、空白は `\s+`）を当てます。
