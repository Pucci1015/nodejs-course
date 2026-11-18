# 練習問題4 考えて答える

本文を読み返しながら、それぞれ2〜4行で答えてください。答えは、このファイルの「答え:」の後に書いてかまいません。確かめられるものは、本文のサンプルを動かして確かめてください。模範解答は [../solutions/README.md](../solutions/README.md) の「問題4」にあります。

## (1) Cookie に id が無いのに

2.2節の Cookie には、alice の id もメールアドレスも入っていませんでした。では、サーバはどうやって、次のリクエストが alice のものだと分かるのでしょう。また、セッションを Redis に保存しているアプリで、`SESSION_SECRET` を別の値に変えて起動し直すと、ログインしていた人はどうなるでしょう。

答え:

## (2) `saveUninitialized: true` にすると

`session-app.ts` の `saveUninitialized` を `true` にして起動し、`curl -s -i http://127.0.0.1:9627/api/me` を3回打つと、応答のヘッダと、サーバの保存場所はどうなるでしょう。困ることを1つ挙げてください。

答え:

## (3) `SameSite=Lax` の Cookie は送られるか

`app.example.com` のセッションの Cookie が `SameSite=Lax` のとき、次のそれぞれで、ブラウザはその Cookie を付けて送るでしょうか。

| | リクエスト | 送るか |
| --- | --- | --- |
| a | `other.example` のページのリンクから、`https://app.example.com/tasks` を開く（GET） | |
| b | `other.example` のページのフォームから、`https://app.example.com/api/tasks` に POST する | |
| c | `blog.example.com` のページの `fetch`（`credentials: 'include'`）で、`https://app.example.com/api/tasks` に POST する | |

c の答えから、5節の `Origin` の確かめが要る理由を説明してください。

答え:

## (4) JWT に入れてよいもの

JWT の2つ目の部分に `{"sub":"1","email":"alice@example.com","passwordHash":"$argon2id$…"}` と入れたアプリがあります。何が問題でしょう。また、トークンを盗まれないようにしても、まだ問題が残る理由を書いてください。

答え:

## (5) ログアウトした後のトークン

6節の `signJwt` で作った、期限 15 分のトークンを使うアプリがあります。ログアウトのボタンで、ブラウザからトークンを消しました。ログアウトする前に、このトークンをコピーしていた人が、5分後にそれを送ると、どうなるでしょう。サーバのセッション（2.3節）と比べてください。

答え:

## (6) 401 と 403

`requireAuth`（4節）は 401、`requireSameOrigin`（5節）は 403 を返します。それぞれ、なぜその番号なのでしょう（第51章 1節の表）。

答え:
