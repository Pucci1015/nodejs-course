# 第54章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part10/ch54-oauth-oidc/exercises/` で行います。最初に `cd exercises` で移動してください。テストは、必要なら練習用の IdP を自分で起動するので、`npm run idp` を動かしておく必要はありません（問題4の一部を除く）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 戻りの URL を読む | [callback.ts](callback.ts)、[callback.test.ts](callback.test.ts) | 3.2・5 |
| 2 | 基本 | アプリの Basic 認証 | [basic-auth.ts](basic-auth.ts)、[basic-auth.test.ts](basic-auth.test.ts) | 3.3 |
| 3 | 基本 | JWKS から鍵を選ぶ | [pick-key.ts](pick-key.ts)、[pick-key.test.ts](pick-key.test.ts) | 2・4 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 3〜8 |
| 5 | 応用 | ID トークンを確かめて、理由を値で返す | [verify-id-token.ts](verify-id-token.ts)、[verify-id-token.test.ts](verify-id-token.test.ts) | 4 |
| 6 | 応用 | コードをトークンに取り替える関数 | [exchange.ts](exchange.ts)、[exchange.test.ts](exchange.test.ts) | 3.3・3.4 |
| 7 | 応用 | 外のログインとユーザーを結びつける | [link-account.ts](link-account.ts)、[link-account.test.ts](link-account.test.ts) | 6 |
| 8 | 発展 | 設定を IdP から読むログインのアプリ | [client-app.ts](client-app.ts)、[client-app.test.ts](client-app.test.ts) | 2・5・8 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第51章と同じです。問題4以外は、`○○.ts` の `// ここを書く` の所を書き、`node --test ○○.test.ts` ですべてのテストが通れば完成です。最初は、「型: tsc のエラーが無い」以外のテストが失敗します。

- 模範解答で試すには `MODULE=../solutions/callback.ts node --test callback.test.ts` のように、`MODULE` に模範解答のファイルを指定します。
- [id-token.ts](id-token.ts) は本文4節のサンプルのコピーです（問題8で使います）。[keys.ts](keys.ts) は、テストのために RSA の鍵を作り、JWT に署名する部品です。どちらも書き換えなくてかまいません。
- [typecheck.ts](typecheck.ts) は、テストの中から tsc を動かす部品です。

---

## 基本

### 問題1 戻りの URL を読む

[callback.ts](callback.ts) に、`parseCallback(url, expectedState)` を書いてください。IdP から戻ってきた URL（3.2節）と、セッションに覚えておいた `state` を受け取り、次の値を返します。

| URL | 返す値 |
| --- | --- |
| `state` が `expectedState` と違う・無い。または `expectedState` が `''` | `{ ok: false, reason: 'state' }`（`error` や `code` は見ない） |
| `error=access_denied` | `{ ok: false, reason: 'denied', error: 'access_denied' }` |
| ほかの `error` | `{ ok: false, reason: 'error', error: その値 }` |
| `code` が無い・空 | `{ ok: false, reason: 'missing_code' }` |
| それ以外 | `{ ok: true, code }` |

- `%2B` などは、元の文字（`+`）に戻してから比べる・返す（`new URL(url).searchParams.get(…)` は戻してくれます）

```sh
$ node --test callback.test.ts
```

### 問題2 アプリの Basic 認証

[basic-auth.ts](basic-auth.ts) に、2つの関数を書いてください（3.3節の「Basic 認証の注意」）。

- `basicAuthHeader(clientId, clientSecret)`: `Basic ` + base64（`フォームの形の clientId` + `:` + `フォームの形の clientSecret`）
  - `basicAuthHeader('task-app', 'dev-only-client-secret')` → `'Basic dGFzay1hcHA6ZGV2LW9ubHktY2xpZW50LXNlY3JldA=='`
  - 空白は `+`、`:` は `%3A`、`ねこ` は `%E3%81%AD%E3%81%93` になる
- `parseBasicAuth(header)`: 逆に、`{ clientId, clientSecret }` を返す。IdP の側の処理です
  - `Basic` は大文字小文字を問わない（`basic …` も読む）
  - 次のときは `null`: `Basic ` で始まらない、base64 の文字（`A-Z`・`a-z`・`0-9`・`+`・`/`、最後に `=` が0〜2個）でない、戻した文字列に `:` が無い、`clientId` が空

```sh
$ node --test basic-auth.test.ts
```

ヒント: 1つの値をフォームの形にするのは、本文3.3節の `new URLSearchParams({ v: 値 }).toString().slice(2)` です。戻すときは、`new URLSearchParams(\`id=${左}&secret=${右}\`)` に読ませると、`+` を空白に、`%XX` を文字に戻してくれます。

### 問題3 JWKS から鍵を選ぶ

[pick-key.ts](pick-key.ts) に、`pickKey(keys, header)` を書いてください。JWKS の `keys` の配列と、ID トークンのヘッダ（`{ alg, kid }`）を受け取り、署名を確かめる公開鍵（`createPublicKey({ key: jwk, format: 'jwk' })` の結果）を返します。使えなければ `null` です。

- `header.alg` が `'RS256'` でなければ `null`（`'none'`・`'HS256'`・無い）
- 使える鍵は、`kty` が `'RSA'`、`use` が無いか `'sig'`、`alg` が無いか `'RS256'` のもの
- `header.kid` があれば、`kid` が同じ鍵。無ければ、使える鍵がちょうど1つのときだけ、その鍵
- `createPublicKey` が例外を投げたら（`n` が無いなど）、`null`

```sh
$ node --test pick-key.test.ts
```

### 問題4 考えて答える

[predict.md](predict.md) の6つの問いに答えてください。(2) は、本文の練習用の IdP（`npm run idp`）を動かして確かめます。

---

## 応用

### 問題5 ID トークンを確かめて、理由を値で返す

[verify-id-token.ts](verify-id-token.ts) に、`verifyIdToken(idToken, keys, options)` を書いてください。本文4節の `verifyIdToken` を、例外ではなく、第52章 練習問題6 と同じように結果を値で返す形にします。上から順に確かめ、最初に見つかった理由を返します。

| 順 | 確かめること | 失敗のとき |
| --- | --- | --- |
| 1 | `.` で3つに分かれ、ヘッダと中身が base64url の JSON のオブジェクト、署名が base64url の文字だけ | `malformed` |
| 2 | ヘッダの `alg` が `RS256` | `alg` |
| 3 | 問題3の決まりで鍵が見つかる | `key` |
| 4 | 署名が合う | `signature` |
| 5 | `iss` が `options.issuer` | `iss` |
| 6 | `aud` が文字列なら `clientId`、配列なら `clientId` を含む。配列が2つ以上なら、`azp` が `clientId` | `aud` |
| 7 | `exp` が数で、`exp + leewaySec` が今（秒）より後 | `expired` |
| 8 | `iat` が数で、`iat - leewaySec` が今より後でない（未来に発行されたことになっていない） | `iat` |
| 9 | `nonce` が `options.nonce` | `nonce` |

- `options.now` はミリ秒（既定 `Date.now()`）、`options.leewaySec` は時計のずれを許す秒数（既定 60）
- 成功なら `{ ok: true, claims: 中身のオブジェクト }`

```sh
$ node --test verify-id-token.test.ts
```

ヒント: 問題3の `pickKey` と、第52章 練習問題2 の `decodePart` を、このファイルにコピーして使ってかまいません。`azp`（authorized party）は、「このトークンを受け取ったアプリ」を書く項目です。あて先が2つ以上あるトークンでは、自分が受け取ったものかを `azp` で確かめます（OpenID Connect Core 3.1.3.7）。

### 問題6 コードをトークンに取り替える関数

[exchange.ts](exchange.ts) に、`exchangeCode(params, fetchFn)` を書いてください。本文3.3節の `exchange.ts` を、アプリから呼べる関数にしたものです。テストは、本物の `fetch` の代わりに、決めた応答を返す `fetchFn` を渡します。

- `params.tokenEndpoint` に `POST` する。`Authorization` は問題2の Basic 認証、`Content-Type` は `application/x-www-form-urlencoded`、ボディは `grant_type=authorization_code`・`code`・`redirect_uri`・`code_verifier` の4つだけ（`client_secret` をボディに入れない）
- 成功（2xx）で、ボディが次の形なら、そのオブジェクトを返す: `access_token`（空でない文字列）、`token_type`（大文字小文字を問わず `bearer`）、`id_token`（空でない文字列）、`expires_in`（正の整数、無くてもよい）、`scope`（文字列、無くてもよい）
- 失敗のときは `OAuthError` を投げる（クラスは書いてあります）

| 応答 | 投げるもの |
| --- | --- |
| 2xx でない、ボディが `{ error, error_description? }` | `new OAuthError(status, error, error_description)` |
| 2xx でない、ボディが JSON でない・形が違う（502 の HTML など） | `new OAuthError(status, 'server_error')` |
| 2xx だが、ボディが JSON でない・上の形でない | `new OAuthError(status, 'invalid_response', …)` |

```sh
$ node --test exchange.test.ts
```

ヒント: ボディの形は Zod の `z.object` で確かめます。`token_type` は `z.string().refine((t) => t.toLowerCase() === 'bearer')` のように、条件を足せます。`res.json()` は、JSON でなければ例外を投げます。

### 問題7 外のログインとユーザーを結びつける

[link-account.ts](link-account.ts) の `createAccounts(initialUsers)` に、`signIn(profile)` を書いてください。本文6節の判断を関数にします。`profile` は IdP から来た `{ provider, sub, email, emailVerified }` です。

| 場合 | 返す値 |
| --- | --- |
| 前に同じ `provider` と `sub` でログインしたことがある（メールアドレスが変わっていても） | `{ kind: 'existing', userId }` |
| 同じメールアドレスのユーザーがいて、`profile.emailVerified` も、そのユーザーの `emailVerified` も `true` | 結びつけて `{ kind: 'linked', userId }`。次からは `existing` |
| 同じメールアドレスのユーザーがいるが、どちらかが確認されていない | `{ kind: 'conflict' }`（何も変えない） |
| それ以外 | 新しいユーザーを作って `{ kind: 'created', userId }`。id は今いちばん大きい id + 1 |

- メールアドレスは、前後の空白を取り、小文字にしてから比べる・保存する
- `sub` は IdP ごと。`provider` が違えば、同じ `sub` でも別の人
- `profile.email` が `undefined` なら、新しいユーザーの `email` は `''`、`emailVerified` は `false`

```sh
$ node --test link-account.test.ts
```

ヒント: 「`provider` と `sub` → ユーザーの id」の `Map` を作ります。キーは `JSON.stringify([provider, sub])` のように2つを組にした文字列にすると、`provider` や `sub` に区切りの文字が入っていても混ざりません。

---

## 発展

### 問題8 設定を IdP から読むログインのアプリ

[client-app.ts](client-app.ts) の `createClientApp(config)` を書いてください。本文5節の `oidc-client.ts` を、次のように広げたものです。`config` は `{ issuer, clientId, clientSecret, redirectUri }` で、テストは練習用の IdP を空いているポートで起動して、ブラウザの代わりに `fetch` でログインの流れを最後まで動かします。

- IdP の URL は書かず、`${issuer}/.well-known/openid-configuration`（2節）から `authorization_endpoint`・`token_endpoint`・`jwks_uri` を読む。設定と JWKS は、最初に使うときに1回だけ読んで覚えておく
- `GET /auth/login?returnTo=…`: 本文と同じく `state`・`nonce`・`verifier` を作り、`returnTo` も一緒にセッションに覚えて、IdP へ 302
- `GET /auth/callback`:
  - `state` が合わなければ 400（別のブラウザで開いた、2回目に開いた）
  - `error=access_denied` なら `303` で `/?login=denied`
  - 成功したら、セッションを作り直して `{ sub, email, name }` を覚え、`303` で覚えた `returnTo` へ
  - IdP とのやり取りや ID トークンの確かめが失敗したら 502
- `GET /api/me`: ログインしていれば `{ sub, email, name }`、していなければ 401
- `POST /auth/logout`: セッションを消して 204
- `safeReturnTo(value)` も export する。`/` で始まり、`//` で始まらず、`\` を含まない文字列ならそのまま、それ以外は `'/'`（第2部 第9章の `safeRedirectPath`）

```sh
$ node --test client-app.test.ts
```

ヒント:
- 「最初に1回だけ読む」は、読み込みの `Promise` を変数に覚えておくと書けます（`discovered ??= (async () => { … })()`）。同時に2つのリクエストが来ても、読むのは1回です。`??=` は、左が `undefined` か `null` のときだけ代入する書き方です。
- `'//other.example/x'` は、ブラウザでは `http://other.example/x` と同じ意味です（第2部 第9章）。`/\other.example` も、ブラウザは `\` を `/` として読みます。
