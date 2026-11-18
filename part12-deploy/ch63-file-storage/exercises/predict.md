# 第63章 練習問題4: 考えて答える

本文を見ながら、答えを書いてください。答えは [../solutions/README.md](../solutions/README.md) の問題4にあります。

1. PaaS で動かしているアプリが、アップロードされた画像を `uploads/` フォルダに保存していました。次の2つのとき、画像はどうなりますか（1節、第62章 2節）。
   - 新しい版をデプロイした
   - アプリを 2 台に増やした

2. 署名付き URL の期限を 7 日にして、メールで送りました。このやり方の困る所を2つ挙げてください（4節、6.2節）。

3. 本文 4.2節の `sign-by-hand.ts` で、`X-Amz-SignedHeaders` を `host` だけにしているのはなぜですか。`user-agent` も署名に含めたら、ブラウザで開いたときに何が起きますか。

4. 利用者がアップロードした `report.html` を、アプリと同じオリジンの `https://app.example.com/files/123` から、`Content-Type: text/html` と `inline` で返すと、何が危ないですか。どう直しますか（6.3節）。

5. 次の順で、タスクの添付ファイルを消すようにしました。1 の後、2 の前にアプリが落ちると、どうなりますか。逆の順（ストレージを先に消す）なら、どうですか。どちらがよいですか（8節）。
   1. ストレージのオブジェクトを消す
   2. データベースの行を消す

6. `samples/stream-upload.ts` を `my-stream.ts` にコピーし、`ContentLength` の行を消して、`Body` を `Readable.from([Buffer.from('abc'), Buffer.from('def')])`（ファイルでないストリーム。`import { Readable } from 'node:stream'`）に替えます。動かすと、どうなると思いますか。予想してから試してください。`ContentLength` の行を消すだけ（`Body` はファイルのストリームのまま）なら、どうですか（3.3節）。
