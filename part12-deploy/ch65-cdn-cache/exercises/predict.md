# 第65章 練習問題4: 考えて答える

本文を見ながら、答えを書いてください。答えは [../solutions/README.md](../solutions/README.md) の問題4にあります。

1. 公開の数を返す `/api/stats` に `Cache-Control: public, max-age=600` を付け、CDN を前に置きました。数が変わってから、ある利用者のブラウザに新しい数が出るまで、いちばん長くて何分かかりますか。`public, max-age=0, s-maxage=600` にして、数が変わったら CDN から消す（7節）と、どうなりますか（2.1節）。

2. 間違えて、`index.html` に `public, max-age=31536000, immutable` を付けてデプロイしてしまいました。次に新しい版をデプロイしたとき、何が起きますか。CDN から消せば直りますか（4.1節、5節）。

3. `index.html` に付けるのは `no-cache` です。`no-store` にすると、何が変わりますか。困ることはありますか（3.3節）。

4. 3.5節の「5つ同時」を、`/api/me`（`private, no-store`）で `-b user=alice` を付けて試すと、5つの `X-Cache` は何になり、オリジンには何回頼みが届くと思いますか。予想してから試してください。

   ```sh
   $ for i in 1 2 3 4 5; do curl -s -b user=alice -w "$W" http://127.0.0.1:9858/api/me & done; wait
   ```

5. `vite build` は、`assets/` の JS・CSS の名前にはハッシュを入れますが、`index.html` の名前には入れません。なぜですか（5節）。

6. CDN を前に置いたら、Express のアクセスログの客の IP アドレスが、全部同じ（いくつかの決まったもの）になりました。なぜですか。第5部 第24章の回数の制限（同じ IP から 1 分に N 回まで）は、どうなりますか（9節）。
