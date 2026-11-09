# 第5章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 問題 |
| --- | --- |
| [hello-server.mjs](hello-server.mjs) | 2・3 |
| [echo-server.mjs](echo-server.mjs) | 5 |
| [ask.mjs](ask.mjs) | 6 |
| [check-port.mjs](check-port.mjs) | 7 |
| [line-server.mjs](line-server.mjs) | 8 |
| [dns-check.mjs](dns-check.mjs) | 9 |
| [line-server-v2.mjs](line-server-v2.mjs) | 10（発展） |
| [port-scan.mjs](port-scan.mjs) | 11（発展） |
| [udp-vs-tcp.mjs](udp-vs-tcp.mjs) | 12（発展） |

模範解答を動かして試すときも、`cp -R` で `~/dev/ch05/` にコピーしてから動かします（教材のフォルダの中では動かしません）。

IP アドレス、ポート番号、TTL などの値は、環境や時期によって変わります。以下の値は**出力例**です。

---

## 問題1 自分の Mac のアドレスとポートを調べる

**1.** 出力例では `ipconfig` が `192.168.1.23`（**プライベートアドレス**）、`api.ipify.org` が `203.0.113.77`（インターネット側の**グローバルアドレス**）です。

**2.** 家の中の機器は、ルーターを通ってインターネットに出ます。そのときルーターが送り主のアドレスを自分のグローバルアドレスに書き換える（**NAT**）ので、外のサービスからはルーターのアドレスが見えます。

**3.** 出力例:

```
COMMAND     PID  USER   FD   TYPE  DEVICE SIZE/OFF NODE NAME
ControlCe   612 alice   10u  IPv4  ...         0t0  TCP *:7000 (LISTEN)
ControlCe   612 alice   11u  IPv4  ...         0t0  TCP *:5000 (LISTEN)
```

```sh
$ ps -p 612
  PID TTY           TIME CMD
  612 ??         0:12.34 /System/Library/CoreServices/ControlCenter.app/Contents/MacOS/ControlCenter
```

`ControlCenter` は macOS の **AirPlay レシーバー**で、他の機器から画面や音声を受け取るために 5000番と 7000番で待ち受けています。Flask の既定のポートが 5000番なので、`flask run` が「Address already in use」で失敗する原因によくなります（システム設定 → 一般 → AirDrop と Handoff →「AirPlay レシーバー」を切ると止まります）。

> 第5章のサンプル `tcp-echo-server.mjs` も 7000番を使います。AirPlay レシーバーは `*:7000`、サンプルは `127.0.0.1:7000` なので、多くの場合は両方動きますが、`EADDRINUSE` が出たら AirPlay レシーバーを切るか、`node tcp-echo-server.mjs 7002` のように番号を変えてください。

**4.** `*:7000` は「すべてのアドレス」で待ち受けているので、同じ Wi-Fi の別の機器からも接続できます。`127.0.0.1:番号` は Mac の中からだけです（本文3.5節）。

## 問題2 相手のアドレスと「何人目か」を返すサーバ

[hello-server.mjs](hello-server.mjs):

```js
let count = 0; // 何人目か。接続のたびに 1 増やすので、関数の外に置く

const server = net.createServer((socket) => {
  count += 1;
  const who = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`${count} 人目: ${who}`);
  socket.write(`あなたは ${who} です（${count} 人目）\n`);
  socket.end();
});
```

```sh
$ nc 127.0.0.1 7010
あなたは 127.0.0.1:33942 です（1 人目）
$ nc 127.0.0.1 7010
あなたは 127.0.0.1:33948 です（2 人目）
```

**つまずきやすい所**: `let count = 0;` を `createServer` の関数の中に書くと、接続のたびに新しく 0 から作られるので、いつも「1 人目」になります。関数の外の変数は、サーバが動いている間ずっと1つだけなので、全部の接続で共有されます。

ポート番号（`33942`、`33948`）は、`nc` の側の OS が毎回空いている番号を選んでいるので、毎回変わります。

## 問題3 ポートを引数で変えられるようにする

```js
const port = Number(process.argv[2] ?? 7010);
// ...
server.listen(port, '127.0.0.1', () => {
  console.log(`${port}番で待ち受けています`);
});
```

**1・2.** 7010 と 7011 は別のポートなので、同時に待ち受けられます。`lsof` には2行表示されます。

**3.** `Error: listen EADDRINUSE: address already in use 127.0.0.1:7010`。**7010番は既に別のプログラム（1つ目の hello-server）が使っている**という意味です。1つのポートで待ち受けられるのは、1つのプログラムだけです。

**4.**

```sh
$ lsof -nP -iTCP:7010 -sTCP:LISTEN
COMMAND   PID  USER   FD   TYPE  DEVICE SIZE/OFF NODE NAME
node    12345 alice   21u  IPv4  0x...      0t0  TCP 127.0.0.1:7010 (LISTEN)
$ ps -p 12345
  PID TTY           TIME CMD
12345 ttys003    0:00.08 node hello-server.mjs
$ kill 12345
```

`ps -p` で、自分が起動した `node hello-server.mjs` であることを確かめてから終了します。この後、3つ目のターミナルで起動し直すと、今度は成功します。

## 問題4 dig で DNS を調べる

**1.** 出力例:

```
1回目: example.com.   3600  IN  A  93.184.215.14    ;; Query time: 48 msec
2回目: example.com.   3597  IN  A  93.184.215.14    ;; Query time: 3 msec
```

1回目は、リゾルバがまだ答えを知らなかったので、権威サーバまで調べに行きました。2回目は**キャッシュ**から答えたので速くなります。TTL は「あと何秒覚えておいてよいか」なので、キャッシュから答えるたびに減っていきます。

**2.** 出力例:

```
www.github.com.     3600  IN  CNAME  github.com.
github.com.           60  IN  A      20.27.177.113
```

**CNAME** と **A** の2種類です。「`www.github.com` は `github.com` の別名」で、`github.com` のアドレスが `20.27.177.113` です。ブラウザが接続するのは、A レコードの `20.27.177.113` です。

**3.**

| コマンド | 出力例 | 何の情報か |
| --- | --- | --- |
| `dig +short gmail.com MX` | `5 gmail-smtp-in.l.google.com.` など5行 | `@gmail.com` 宛てのメールを受け取るサーバ。数字は優先度で、小さいほど先に使う |
| `dig +short github.com NS` | `dns1.p08.nsone.net.` など | `github.com` について答える権威 DNS サーバ |

**4.** `@` の後ろは「問い合わせる DNS サーバ」です（8.8.8.8 は Google、1.1.1.1 は Cloudflare）。`example.com` なら、どちらも同じアドレスが返るのが普通です。大きなサイトでは、問い合わせてきた場所に近いサーバのアドレスを返すことがあるので、違うこともあります。

## 問題5 受け取ったものを送り返すサーバ

[echo-server.mjs](echo-server.mjs):

```js
const server = net.createServer((socket) => {
  console.log('[接続]');
  socket.on('data', (chunk) => {
    const text = chunk.toString();
    console.log(`[受信] ${chunk.length} バイト`);
    if (text.trim() === 'bye') {
      socket.end('さようなら\n'); // 送ってから接続を終える
    } else {
      socket.write(text);
    }
  });
  socket.on('end', () => console.log('[切断]'));
});
```

`hello` と打つと `[受信] 6 バイト`（`hello` の5バイトと改行1バイト）と表示されます。

**つまずきやすい所**:

- `text === 'bye'` と比べると、届いた文字は `'bye\n'` なので一致しません。`trim()` が必要です。
- `printf 'hello\nbye\n' | nc 127.0.0.1 7020` のように、**2行を一度に**送ると、`bye` で切断されません。2行が1回の `'data'` にまとまって届き、`'hello\nbye'` は `'bye'` と一致しないからです。本文4.3節の「TCP はバイトの流れ」がここでも起きています。正しく扱うには、問題8の「改行で区切る」処理が必要です。

## 問題6 1行送って返事を表示するクライアント

[ask.mjs](ask.mjs):

```js
const port = Number(process.argv[2] ?? 7020);
const text = process.argv[3] ?? 'hello';

const socket = net.connect(port, '127.0.0.1');

socket.on('connect', () => {
  socket.write(`${text}\n`);
});

socket.on('data', (chunk) => {
  console.log(`返事: ${chunk.toString().trim()}`);
  socket.end(); // 返事を1つ受け取ったら終わる
});

socket.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log(`${port}番でサーバが起動していません`);
  } else {
    console.log(`エラー: ${err.code}`);
  }
});
```

```sh
$ node ask.mjs 7020 hello
返事: hello
$ node ask.mjs 7021 hello
7021番でサーバが起動していません
```

`socket.end()` を書き忘れると、接続が開いたままなので、プログラムが終わりません（`Ctrl + C` で止めることになります）。Node.js は「まだ何かが起きるかもしれない接続」が残っている間は終わらないからです。

## 問題7 ポートが open か closed かを調べる

[check-port.mjs](check-port.mjs) の中心部分:

```js
const socket = net.connect(port, host);
socket.setTimeout(2000);

socket.on('connect', () => {
  console.log(`${host}:${port} open（待ち受けている）`);
  socket.destroy();
});
socket.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log(`${host}:${port} closed（拒否された）`);
  } else {
    console.log(`${host}:${port} エラー ${err.code}`);
  }
});
socket.on('timeout', () => {
  console.log(`${host}:${port} timeout（2秒待っても返事が無い）`);
  socket.destroy();
});
```

```sh
$ node check-port.mjs 7020
127.0.0.1:7020 open（待ち受けている）
$ node check-port.mjs 7021
127.0.0.1:7021 closed（拒否された）
$ node check-port.mjs 80 192.0.2.1
192.0.2.1:80 timeout（2秒待っても返事が無い）
```

closed はすぐに、timeout は2秒後に表示されます。この時間の違いが、「相手の機器には届いた」か「届いていない」かの手がかりです（本文4.2節）。

## 問題8 改行で区切って1行ずつ受け取るサーバ

**1.** naive-line-server.mjs の表示例:

```
1: apple
ban
2: ana
3: こ�
4: ��にちは
最後のメッセージ
```

（区切れ方は、タイミングによって変わります。）原因は2つあります。

- **1回の `'data'` に2行入ってくる**（`apple\nban`）。TCP は送った側の `write` の区切りを覚えていないので、まとまって届きます。
- **1行が2回の `'data'` に分かれる**（`ban` と `ana\n`）。

**2.** [line-server.mjs](line-server.mjs) の中心部分:

```js
const server = net.createServer((socket) => {
  let buffer = ''; // まだ改行が来ていない、途中までの文字

  socket.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // 最後の1つは途中の部分なので、次の 'data' まで残す
    for (const line of lines) {
      count += 1;
      console.log(`${count}: ${line}`);
      socket.write(`受け取りました: ${line}\n`);
    }
  });
});
```

**3.** 実行結果:

```
1: apple
2: banana
3: こ���にちは
4: 最後のメッセージ
```

`ex-sender.mjs` の側にも `サーバから: 受け取りました: apple` などと表示されます。3行目は、「こんにちは」の「ん」の3バイトが2回の `'data'` に分かれて届き、`chunk.toString()` がそれぞれを文字にしようとして化けています（問題10で直します）。

## 問題9 名前解決の2つの方法を比べる

[dns-check.mjs](dns-check.mjs) の後半:

```js
if (lookupOk && !resolve4Ok) {
  console.log('→ OS は知っているが DNS には無い名前（/etc/hosts に書かれているかもしれない）');
} else if (!lookupOk) {
  console.log('→ どこにも見つからない名前');
} else {
  console.log('→ DNS に登録されている名前');
}
```

```sh
$ node dns-check.mjs localhost
lookup:   127.0.0.1
resolve4: 失敗 ENOTFOUND
resolve6: 失敗 ENOTFOUND
→ OS は知っているが DNS には無い名前（/etc/hosts に書かれているかもしれない）
$ node dns-check.mjs example.com
lookup:   93.184.215.14
resolve4: 93.184.215.14
resolve6: 2606:2800:21f:cb07:6820:80da:af6b:8b2c
→ DNS に登録されている名前
$ node dns-check.mjs no-such-name.invalid
lookup:   失敗 ENOTFOUND
resolve4: 失敗 ENOTFOUND
resolve6: 失敗 ENOTFOUND
→ どこにも見つからない名前
```

`localhost` は `/etc/hosts` にだけ書かれているので、OS に聞く `lookup` では見つかり、DNS に直接聞く `resolve4` では見つかりません。`fetch` などの普段の通信は `lookup` を使うので、ブラウザや Node.js のプログラムで `localhost` が使えます。`.invalid` は、どこにも登録されないと決められている名前です。

## 問題10 文字化けしない行サーバ（発展）

[line-server-v2.mjs](line-server-v2.mjs):

```js
const server = net.createServer((socket) => {
  // 次の3つは接続ごとに作る（関数の中に置く）。外に置くと、同時に来た接続どうしで混ざる
  clients += 1;
  const name = `接続${clients}`;
  const decoder = new StringDecoder('utf8'); // 修正: 文字の途中で切れたバイトを持っておく
  let buffer = '';
  let count = 0;

  function printLine(line) {
    count += 1;
    console.log(`[${name}] ${count}: ${line}`);
    socket.write(`受け取りました: ${line}\n`);
  }

  socket.on('data', (chunk) => {
    buffer += decoder.write(chunk); // 修正: chunk.toString() の代わり
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      printLine(line);
    }
  });

  socket.on('end', () => {
    // 修正: 改行の無いまま終わった残りも、1行として扱う
    buffer += decoder.end();
    if (buffer !== '') {
      printLine(buffer);
    }
    socket.end();
  });
});
```

2つ同時に送ったときの表示例:

```
[接続1] 1: apple
[接続2] 1: apple
[接続1] 2: banana
[接続2] 2: banana
[接続1] 3: こんにちは
[接続1] 4: 最後のメッセージ
[接続2] 3: こんにちは
[接続2] 4: 最後のメッセージ
[接続3] 1: no newline
```

2つの接続の行が交互に出ますが、それぞれの中では順番どおりで、混ざっていません。もし `buffer` を `createServer` の外に置くと、接続1の `ban` に接続2の `apple` がつながる、といったことが起きます。

## 問題11 ポートの範囲を一度に調べる（発展）

[port-scan.mjs](port-scan.mjs) の中心部分:

```js
function done() {
  finished += 1;
  if (finished === total) {
    open.sort((a, b) => a - b);
    console.log(`${start}〜${end} の ${total} 個を ${Date.now() - startedAt}ms で調べました`);
    console.log(`open ${open.length} 個: ${open.join(', ')}`);
    console.log(`closed ${closed} 個、その他 ${other} 個`);
  }
}

for (let port = start; port <= end; port++) {
  const socket = net.connect(port, '127.0.0.1');
  socket.setTimeout(1000);
  socket.on('connect', () => { open.push(port); socket.destroy(); done(); });
  socket.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') { closed += 1; } else { other += 1; }
    done();
  });
  socket.on('timeout', () => { other += 1; socket.destroy(); done(); });
}
```

```
7000〜7100 の 101 個を 21ms で調べました
open 2 個: 7000, 7020
closed 99 個、その他 0 個
```

**なぜ速いか**: `for` は接続を**始めるだけ**で、結果を待たずに次のポートへ進みます。101個の接続が同時に進み、結果はばらばらに届きます。そのため、「結果が出た数」を数えて、全部そろったときにまとめて表示します。1つずつ結果を待ってから次へ進む書き方は、第3部で学ぶ `await` を使えばできますが、timeout が多いと何十秒もかかります。

**範囲を 1000 個までにする理由**: 一度に何万もの接続を始めると、OS が同時に開けるファイルの数の上限（Mac では既定で 256 程度のこともあります）を超えて、`EMFILE` というエラーが出ます。本格的なツールは、同時に進める数に上限を設けています（第3部で学ぶ書き方で作れます）。

## 問題12 TCP と UDP の違いを確かめる（発展）

[udp-vs-tcp.mjs](udp-vs-tcp.mjs):

```
UDP: エラーなしで送り終わった → 届いたかどうかは分からない
TCP: エラー ECONNREFUSED → 相手の OS が「だれもいない」と拒否した
```

**3.** TCP は、データを送る前に**接続**を作ります。相手の OS が「そのポートにはだれもいない」と拒否するので、送る側はすぐに失敗を知ることができます。UDP は**接続を作らず**、**届くことも保証しない**ので、だれも受け取っていなくても、送った側は「送り終わった」としか分かりません。届いたか知りたければ、受け取った側が返事を送る約束を、アプリ側で決める必要があります。

**4.** 0.5秒前のコマは、送り直してもらって届くころにはもう古く、見せる意味がありません。TCP では、なくなったデータを送り直して順番どおりに並べるまで、**後ろのデータも待たされる**ので、映像が止まってしまいます。UDP なら、なくなったコマは飛ばして、新しいコマをすぐに見せられます。
