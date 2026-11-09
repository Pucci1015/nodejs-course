# 第16章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [parse-cli.mjs](parse-cli.mjs) | 問題2: `parseCli` と `UsageError` |
| [grep.mjs](grep.mjs) | 問題3: 直した grep |
| [confirm.mjs](confirm.mjs) | 問題4: `confirm`、`NotInteractiveError`、`CancelledError` |
| [long-task.mjs](long-task.mjs) | 問題5: シグナルで安全に止まる書き出し |
| [load-config.mjs](load-config.mjs) | 問題6: `loadConfig` と `ConfigError` |

模範解答は、`exercises` フォルダで次のように確かめられます。

```sh
$ cd ../exercises
$ MODULE=../solutions/parse-cli.mjs node --test parse-cli.test.mjs
$ bash check-grep.sh ../solutions/grep.mjs
$ MODULE=../solutions/confirm.mjs node --test confirm.test.mjs
$ MODULE=../solutions/confirm.mjs node confirm-demo.mjs
$ bash check-long-task.sh ../solutions/long-task.mjs
$ MODULE=../solutions/load-config.mjs node --test load-config.test.mjs
```

---

## 問題1 リダイレクトとパイプの結果を予想する

```
### 1. node streams.mjs > out.txt; cat out.txt
err 1          ← 画面（stderr）。ファイルに入らないので、cat より先に出る
out 1          ← cat out.txt
out 2
### 2. node streams.mjs 2> /dev/null
out 1
out 2
### 3. node streams.mjs 2>&1 | wc -l
3
### 4. node streams.mjs | wc -l
err 1          ← stderr はパイプを通らず、画面に出る
2
### 5. node streams.mjs fail && echo 成功
out 1
err 1
out 2          ← 終了コードが 1 なので「成功」は出ない
### 6. node streams.mjs fail || echo 失敗
out 1
err 1
out 2
失敗
### 7. node streams.mjs fail; echo $?
out 1
err 1
out 2
1
### 8. node streams.mjs fail | wc -l; echo $?
err 1
2
0
### 9. node streams.mjs > out.txt 2>&1; echo ---; cat out.txt
---
out 1
err 1
out 2
### 10. node streams.mjs 2>&1 > out.txt; echo ---; cat out.txt
err 1
---
out 1
out 2
### 11. node streams.mjs | grep err; echo $?
err 1
1
```

**8番**: パイプ全体の終了コード（`$?`）は、**最後のコマンド**（`wc -l`）の終了コードです。`wc` は成功したので 0 です。`streams.mjs` の終了コードは、zsh なら `echo $pipestatus`（`1 0`）、bash なら `echo ${PIPESTATUS[@]}`（`1 0`）で見られます。どちらも、次のコマンドを実行すると上書きされるので、すぐに見ます。スクリプトでは `set -o pipefail` を書くと、どこかが失敗したらパイプ全体が失敗になります。

**9番と10番**: リダイレクトは**左から順に**、「今の行き先をコピーする」操作です。

- 9番: `> out.txt` で stdout を out.txt に向けてから、`2>&1` で stderr を「今の stdout の行き先」（out.txt）に向ける。両方がファイルに入る
- 10番: 先に `2>&1` で stderr を「今の stdout の行き先」（画面）に向けてから、`> out.txt` で stdout だけを out.txt に向ける。stderr は画面のまま

`2>&1` は「stderr を stdout につなぐ」ではなく、「stderr の行き先を、**今の** stdout の行き先と同じにする」です。

**11番**: `err 1` は stderr なので、パイプを通らず画面に直接出ています。`grep` が受け取ったのは `out 1` と `out 2` だけで、`err` を含む行は無いので、終了コード 1（見つからなかった）です。stderr も `grep` に渡すなら `2>&1 |`（zsh と bash 4 以降なら `|&`）です。

ファイルの中の順番（9番の `out 1`・`err 1`・`out 2`）は、出した順のままです。`console.log` と `console.error` は、ファイルに書くときは同期で書かれるからです（本文6.1節）。

## 問題2 サブコマンドのある CLI の引数を解析する

[parse-cli.mjs](parse-cli.mjs) の流れは次のとおりです。

1. `--` より前だけを見て、`--help`・`-h` を探す。あればヘルプ（ほかの間違いより先）
2. 1つ目の引数が `-` で始まらなければサブコマンド。`Object.hasOwn(COMMANDS, command)` で確かめる
3. サブコマンドごとの `options` で `parseArgs` する。`parseArgs` のエラーは `UsageError` に包み直す
4. 値を確かめて（日付、整数、位置引数の数）、決まった形のオブジェクトを返す

```js
const COMMANDS = {
  add: { tag: { type: 'string', short: 't', multiple: true }, due: { type: 'string' } },
  list: { tag: { type: 'string', short: 't' }, all: { type: 'boolean', short: 'a' }, limit: { type: 'string', short: 'n' } },
  done: {},
};
```

**つまずきやすいところ**

- `COMMANDS[command]` で確かめると、`constructor` や `toString` が「ある」ことになります。`COMMANDS.constructor` は `Object` 関数だからです。`in` 演算子も同じです。`Object.hasOwn` を使うか、`Object.create(null)` や `Map` で表を作ります
- 整数の確かめ方。`Number(s)` してから `Number.isInteger` で確かめると、`''`（0）、`' 3'`（3）、`'1e2'`（100）、`'0x10'`（16）が通ってしまいます。**文字列のまま**正規表現 `/^[1-9]\d*$/` で確かめます
- 日付の確かめ方。`new Date('2026-02-30')` は `Invalid Date` にならず、3月2日になります。`Date.UTC(年, 月 - 1, 日)` で作り、`getUTCFullYear`・`getUTCMonth`・`getUTCDate` が元と同じかを比べます（`Date.UTC` を使うのは、Mac のタイムゾーンで日付がずれないようにするためです）
- ヘルプは、ほかの検査より**先に**探します。`done x --nope --help` のように間違いがあっても、ヘルプを求めている人にはヘルプを見せます。ただし `add -- --help` の `--help` はタイトルなので、`--` より前だけを見ます
- `parseArgs` の `strict` を外してはいけません。外すと、`--tga` のような打ち間違いが黙って無視されます

## 問題3 パイプの中で壊れる grep を直す

[grep.mjs](grep.mjs) で直したところには `// 修正:`、足したところには `// 追加:` を付けています。

| NG | 何が起きていたか | 直し方 |
| --- | --- | --- |
| 3, 4a, 5 | 最後の `process.exit(0)` と、エラーのときに `return` するだけで、終了コードがいつも 0 | `main` が終了コードを返し、`process.exitCode` に入れる |
| 4b, 4c, 5 | エラーを `console.log`（stdout）に出していた。`> out.txt` するとファイルに混ざる | `console.error` に出す |
| 6 | `\x1b[1;31m` を自分で書いていて、出力先を見ていなかった | `styleText` に任せる（`validateStream: true`、`stream: process.stdout`）。`always` のときだけ `validateStream: false` |
| 9 | `process.exit(0)` で、まだパイプに書けていない分を捨てていた | `process.exitCode` にして、書き終わるのを待ってから自然に終わる |
| 10 | `head` が閉じた後の書き込みで EPIPE。`'error'` のリスナーが無いので落ちた | `process.stdout.on('error')` で EPIPE を受け取り、`process.exit(0)` |
| 11a, 11b | チャンクごとに `toString()` して `split('\n')` していた。境目で、UTF-8 の文字が切れて `�`（U+FFFD）になり、行も2つに割れる | `readline` に任せる（中で `StringDecoder` を使い、行もつなぐ） |

```sh
$ bash check-grep.sh ../solutions/grep.mjs
[OK] 1. 見つかった行を出す
...
[OK] 11b. 文字化け（U+FFFD）が無い

すべて成功しました
```

**9番が少ししか切れない理由**: `buggy-grep.mjs` は、`write` が `false` を返したら `'drain'` を待つ（背圧を守る）ので、書き終わっていない分は、いつも Stream のバッファ（`highWaterMark`、16KB）くらいしか溜まっていません。`process.exit` で捨てられるのはその分だけです。`exit-demo.mjs` は 10MB を1回の `write` で渡したので、パイプに入りきらなかったほとんどが捨てられました。どちらにしても、`process.exit` で終わらせれば何かが切れる可能性がある、ということです。

**EPIPE の後に `process.exit(0)` を使う理由**: 本文6.1節では「`exit` ではなく `exitCode`」でしたが、EPIPE の後は、もう誰も読んでいないので、捨てて困る出力がありません。むしろ `exitCode` にして続けると、残りのファイルを最後まで読んで、書けない出力を作り続けます。

**つまずきやすいところ**

- バグの版では、`events.once(process.stdout, 'drain')` ではなく `new Promise((r) => process.stdout.once('drain', r))` で待っていました。`events.once` は、待っている間に `'error'` が来ると Promise を rejected にするので、たまたま EPIPE を「受け取って」しまい、落ちずにエラーが握りつぶされることがあります。どちらで待つ場合も、EPIPE は `process.stdout.on('error')` で、はっきり扱います
- `console.log` で書いていれば、10番は NG になりません（本文7節。`console` は書き込みのエラーを無視します）。ただし背圧を守らないので、大きな入力ではメモリを使い続けます
- `re.test` を `g` フラグ付きの正規表現で繰り返すときは、`lastIndex` が前の結果を覚えています。行ごとに `re.lastIndex = 0` にします（第11章）
- 本物の `grep` は、パターンが空文字列にマッチする（`grep ''`）ときも全部の行を出します。`highlight` でマッチが空のときに色を付けないのは、空の色付き文字列（制御文字だけ）を出さないためです
- 確認スクリプトの8番（`FORCE_COLOR=1`）は、バグの版でも成功しています。いつも色を付けていたからです。直した版では `styleText` が `FORCE_COLOR` を見て色を付けます

## 問題4 「本当に消しますか？」と聞く関数

```js
export async function confirm(message, { input = process.stdin, output = process.stderr, assumeYes = false, defaultAnswer = false, maxTries = 3 } = {}) {
  if (assumeYes) return true;
  if (!input.isTTY) throw new NotInteractiveError('端末ではないので確認できません。確認なしで進めるなら --yes を付けてください');

  const rl = createInterface({ input, output, terminal: Boolean(input.isTTY && output.isTTY) });
  const ac = new AbortController();
  let cancelled = false;
  rl.once('close', () => ac.abort());
  rl.once('SIGINT', () => { cancelled = true; ac.abort(); });
  // ... rl.question(..., { signal: ac.signal }) を maxTries 回まで
}
```

最初の版の何が足りなかったかを、テストの順に見ます。

| テスト | 最初の版 | 解答 |
| --- | --- | --- |
| はいの書き方いろいろ | `answer === 'y'` だけ | `trim().toLowerCase()` してから、`Set` で引く |
| 何も打たずに Enter | `[y/N]` しか出さず、既定の答えも無い | `defaultAnswer` で `[Y/n]` と既定の答えを変える |
| 分からない答え | 1回で終わる | `maxTries` 回まで聞き直す |
| 答えずに入力が終わった | **止まったまま**（1秒のタイムアウトで失敗） | `rl` の `'close'` で `AbortController` を止め、`question` を AbortError で終わらせる |
| assumeYes | 聞いてしまう | 最初に `return true` |
| 端末ではない | パイプの `y` を答えとして読んでしまう | `input.isTTY` を見て、`NotInteractiveError` |

**止まったままになる理由**: `readline/promises` の `question` は、`terminal` モードでないときに入力が終わっても、答えを待ち続けます（執筆時点の Node.js 26 で確かめました）。待っている Promise のほかに何もなくなるので、プロセスは終了コード 13（終わっていない top-level await）で終わるか、テストでは止まったままになります。端末で `Ctrl+D` や `Ctrl+C` を押したときは、執筆時点では `question` が `AbortError`（`Aborted with Ctrl+D`）で rejected になります。どちらの場合も、自分で `'close'` を受け取っておけば、確実に終われます。

**`Ctrl+C` について**: `terminal` モードの `readline` は、端末を「生」のモード（raw mode）にして、1文字ずつ自分で読みます。そのため、`Ctrl+C` は OS のシグナル（SIGINT）にならず、`rl` の `'SIGINT'` イベントとして届きます。リスナーが無いと `rl` が閉じるだけなので、ここで `CancelledError`（`exitCode` 130）にして、呼んだ側が「止められた」と分かるようにします。`process.on('SIGINT')` では受け取れないことに注意してください。

```sh
$ MODULE=../solutions/confirm.mjs node confirm-demo.mjs
メモを3件消します。よろしいですか？ [y/N] うーん
y か n で答えてください
メモを3件消します。よろしいですか？ [y/N] ^C
エラー: 中止しました
$ echo $?
130
```

**つまずきやすいところ**

- `rl.close()` は `input` を閉じません（一時停止するだけ）。そのため、同じ `process.stdin` で何度でも聞けます。逆に、`input.destroy()` や `input.end()` をすると、2回目が聞けません
- `output` の既定を `process.stdout` にすると、`memo rm 3 > log.txt` のときに質問がファイルに入り、画面には何も出ずに止まって見えます
- 「端末でなければ断る」のは、`yes | memo rm --all`（`yes` は `y` を出し続けるコマンド）のような使い方で、確かめたことにならないためです。自動で進めたい人には `--yes` という**はっきりした**方法を用意します

## 問題5 Ctrl+C で止めても壊れない書き出し

[long-task.mjs](long-task.mjs) の要点は、「シグナルのリスナーでは印を付けるだけ」です。

```js
let stopping = null;
function onSignal(signal, code) {
  if (stopping) process.exit(code); // 2回目: すぐ終わる
  stopping = { signal, code };      // 1回目: 印を付けるだけ
}
process.on('SIGINT', () => onSignal('SIGINT', 130));
process.on('SIGTERM', () => onSignal('SIGTERM', 143));

const tmp = path.join(path.dirname(out), `.${path.basename(out)}.${process.pid}.tmp`);
const fh = await fs.open(tmp, 'wx');
try {
  for (let i = 1; i <= items; i++) {
    if (stopping) break;            // 仕事の切れ目で確かめる
    await sleep(delay);
    await fh.write(`item ${i}\n`);
  }
  if (!stopping) await fh.sync();
} finally {
  await fh.close();
}
if (stopping) { await fs.rm(tmp, { force: true }); process.exitCode = stopping.code; }
else await fs.rename(tmp, out);
```

```sh
$ bash check-long-task.sh ../solutions/long-task.mjs
...
すべて成功しました
```

**直す前に 130・143 が成功していた理由**: シグナルのリスナーが無いとき、Node.js はシグナルで**殺されます**（OS が止める）。シェルは「シグナルで止まった」ことを 128 + 番号で表すので、`$?` は 130・143 になります。直した後は、Node.js が自分で `process.exitCode = 130` を決めて**ふつうに**終わります。`$?` は同じでも、前者は片付けをしておらず、後者は片付けを終えています。呼んだ側からは区別できないので、自分で受け取るときも同じ番号にそろえておくと、「止められた」と正しく伝わります。

**つまずきやすいところ**

- リスナーの中で、すぐに一時ファイルを消して `process.exit` すると、ループがまだ `fh.write` している途中かもしれません。片付けはループが止まった後、1か所で行います
- 一時ファイルは**同じフォルダ**に作ります。`os.tmpdir()` に作ると、別のディスク（ボリューム）になることがあり、`rename` が `EXDEV` で失敗します（第15章3.4節）
- 一時ファイルの名前に PID を入れ、`wx` で開くのは、2つ同時に動かしても、同じ一時ファイルを取り合わないためです
- 2回目のシグナルで `process.exit` したときは、一時ファイルが残ります。名前を `.` で始めて目立たないようにし、次に動かしたときや、別のコマンドで掃除できるようにしておくのが現実的です
- `kill -9`（SIGKILL）は受け取れません。どんなに丁寧に書いても、一時ファイルが残る可能性はあります。だからこそ「元のファイルを直接書き換えない」ことが大事です

## 問題6 設定を重ねて読み込む

[load-config.mjs](load-config.mjs) は、`set(key, value, source)` で値と出どころを一緒に記録しながら、弱い順に重ねます。

```js
const config = { dir: path.join(home, 'memos'), editor: 'vi', color: true };
const sources = { dir: 'default', editor: 'default', color: 'default' };
const set = (key, value, source) => { config[key] = value; sources[key] = source; };

// 1. 設定ファイル → 2. 環境変数 → 3. 引数 の順に set していく
```

**つまずきやすいところ**

- `{ ...defaults, ...fromFile, ...fromEnv, ...fromArgs }` と混ぜる方法（本文9節のサンプル）でも、値は正しく重なります。ただし、`fromFile` に `undefined` の値が入っていると、それで上書きされてしまいます（`{ ...{ a: 1 }, ...{ a: undefined } }` は `{ a: undefined }`）。値が「ある」ときだけ入れるように書きます
- 空の環境変数を「ある」と扱うと、`EDITOR=` のときにエディタが空文字列になり、後で `spawn('')` が失敗します。`??` は空文字列を素通りさせるので、空文字列を `undefined` にしてから `??` でつなぎます
- `JSON.parse('null')` は `null`、`JSON.parse('[1]')` は配列です。「正しい JSON」と「設定として正しい」は別なので、オブジェクトかどうかも確かめます
- 設定ファイルの `dir` の相対パスを `cwd` から解決すると、どのフォルダで `memo` を実行したかで、メモの場所が変わってしまいます。設定ファイルの中の相対パスは、設定ファイルのあるフォルダから解決します
- `fs.existsSync` で確かめてから読むと、「無い」と「読めない（権限が無い、フォルダだった）」の区別がつきません。読んでみて、`err.code` で場合分けします（第15章3.3節）
- 型の違う値（`"color": "no"`）を黙って既定の値にすると、利用者は設定が効かない理由が分かりません。エラーにして、ファイルと項目の名前を出します。逆に、知らない項目（`colour` の打ち間違い）は、新しい版の設定ファイルを古い版で読むこともあるので、警告にとどめます
