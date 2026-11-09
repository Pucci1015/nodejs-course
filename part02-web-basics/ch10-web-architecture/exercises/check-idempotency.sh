#!/usr/bin/env bash
# 練習問題8 用: POST /api/tasks が Idempotency-Key の要件を満たすかを確かめる
# 使い方（~/dev/ch10 で）: bash exercises/check-idempotency.sh [サーバのファイル]   既定: idempotent-api.mjs
#   指定したファイルを 8529 番ポート（保存にかかる時間 300ms）で起動して確かめ、終わったら止める。
set -uo pipefail

FILE="${1:-idempotent-api.mjs}"
PORT=8529
URL="http://127.0.0.1:$PORT/api/tasks"
FAILED=0
TMP="$(mktemp -d)"

if [ ! -f "$FILE" ]; then
  echo "$FILE がありません。~/dev/ch10 で slow-api.mjs をコピーして作ってください: cp exercises/slow-api.mjs idempotent-api.mjs" >&2
  exit 2
fi

DELAY_MS=300 node "$FILE" "$PORT" >"$TMP/server.log" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null; wait "$PID" 2>/dev/null; rm -rf "$TMP"' EXIT
for _ in $(seq 1 50); do
  curl -s -o /dev/null "$URL" && break
  sleep 0.1
done

ok() { echo "[OK] $1"; }
ng() {
  echo "[NG] $1"
  echo "     $2"
  FAILED=$((FAILED + 1))
}

# 指定したタイトルのタスクの数
count() {
  curl -s "$URL" | node -e '
    let s = ""; process.stdin.on("data", (c) => (s += c)).on("end", () => {
      console.log(JSON.parse(s).filter((t) => t.title === process.argv[1]).length);
    });' "$1"
}

# POST して、ステータス・ヘッダ・ボディを $TMP/<名前>.{status,headers,body} に保存する
#   post <名前> <タイトルの JSON> [Idempotency-Key]
post() {
  local name="$1" json="$2"
  local args=(-s -X POST -H 'Content-Type: application/json' -d "$json" -D "$TMP/$name.headers" -o "$TMP/$name.body" -w '%{http_code}')
  if [ $# -ge 3 ] && [ -z "$3" ]; then
    args+=(-H 'Idempotency-Key;') # curl で値が空のヘッダを送るときは「名前;」と書く（「名前:」だとヘッダを消す意味になる）
  elif [ $# -ge 3 ]; then
    args+=(-H "Idempotency-Key: $3")
  fi
  curl "${args[@]}" "$URL" >"$TMP/$name.status"
  tr -d '\r' <"$TMP/$name.headers" >"$TMP/$name.h" && mv "$TMP/$name.h" "$TMP/$name.headers"
}
st() { cat "$TMP/$1.status"; }
hdr() { grep -i "^$2:" "$TMP/$1.headers" | head -1 | cut -d' ' -f2-; }

# 1. キーが無ければ、今までどおり毎回作る
post n1 '{"title":"キーなし"}'
post n2 '{"title":"キーなし"}'
if [ "$(st n1)" = "201" ] && [ "$(st n2)" = "201" ] && [ "$(count キーなし)" = "2" ]; then
  ok "1. キーが無い POST は、毎回タスクを作る"
else
  ng "1. キーが無い POST は、毎回タスクを作る" "ステータス: $(st n1), $(st n2)、タスクの数: $(count キーなし)"
fi

# 2. 1回目は普通に作る
post a1 '{"title":"キーA"}' key-a
if [ "$(st a1)" = "201" ] && [ -n "$(hdr a1 location)" ] && [ -z "$(hdr a1 idempotent-replayed)" ]; then
  ok "2. 1回目は 201 と Location（Idempotent-Replayed は付けない）"
else
  ng "2. 1回目は 201 と Location（Idempotent-Replayed は付けない）" "ステータス: $(st a1)、Location: $(hdr a1 location)、Idempotent-Replayed: $(hdr a1 idempotent-replayed)"
fi

# 3. 同じキー・同じ内容の2回目は、1回目と同じ結果
post a2 '{"title":"キーA"}' key-a
if [ "$(st a2)" = "201" ] && cmp -s "$TMP/a1.body" "$TMP/a2.body" && [ "$(hdr a1 location)" = "$(hdr a2 location)" ] && [ "$(hdr a2 idempotent-replayed)" = "true" ]; then
  ok "3. 2回目は、1回目と同じステータス・ボディ・Location と、Idempotent-Replayed: true"
else
  ng "3. 2回目は、1回目と同じステータス・ボディ・Location と、Idempotent-Replayed: true" "ステータス: $(st a2)、ボディ: $(cat "$TMP/a2.body")、Location: $(hdr a2 location)、Idempotent-Replayed: $(hdr a2 idempotent-replayed)"
fi

# 4. タスクは1つだけ
if [ "$(count キーA)" = "1" ]; then
  ok "4. 同じキーで2回送っても、タスクは1つ"
else
  ng "4. 同じキーで2回送っても、タスクは1つ" "「キーA」のタスクの数: $(count キーA)"
fi

# 5. 同じキー・違う内容は 422
post a3 '{"title":"キーAを別の内容で"}' key-a
if [ "$(st a3)" = "422" ] && [ "$(count キーAを別の内容で)" = "0" ]; then
  ok "5. 同じキーで違う内容を送ると 422（タスクは作らない）"
else
  ng "5. 同じキーで違う内容を送ると 422（タスクは作らない）" "ステータス: $(st a3)、タスクの数: $(count キーAを別の内容で)"
fi

# 6. 処理中に同じキーが届いたら 409
post b1 '{"title":"キーB"}' key-b &
B1=$!
sleep 0.1
post b2 '{"title":"キーB"}' key-b
wait "$B1"
if [ "$(st b1)" = "201" ] && [ "$(st b2)" = "409" ] && [ "$(count キーB)" = "1" ]; then
  ok "6. 1回目を処理している間に届いた同じキーには 409（タスクは1つ）"
else
  ng "6. 1回目を処理している間に届いた同じキーには 409（タスクは1つ）" "1回目: $(st b1)、2回目: $(st b2)、タスクの数: $(count キーB)"
fi

# 7. 処理が終わった後なら、1回目の結果が返る
post b3 '{"title":"キーB"}' key-b
if [ "$(st b3)" = "201" ] && cmp -s "$TMP/b1.body" "$TMP/b3.body"; then
  ok "7. 409 の後で送り直すと、1回目の結果が返る"
else
  ng "7. 409 の後で送り直すと、1回目の結果が返る" "ステータス: $(st b3)、ボディ: $(cat "$TMP/b3.body")"
fi

# 8. 入力の誤りは記録しない（直して同じキーで送り直せる）
post c1 '{"title":""}' key-c
post c2 '{"title":"キーC"}' key-c
if [ "$(st c1)" = "422" ] && [ "$(st c2)" = "201" ] && [ -z "$(hdr c2 idempotent-replayed)" ] && [ "$(count キーC)" = "1" ]; then
  ok "8. 422 になったキーは記録せず、直した内容を同じキーで送れる"
else
  ng "8. 422 になったキーは記録せず、直した内容を同じキーで送れる" "1回目: $(st c1)、2回目: $(st c2)、Idempotent-Replayed: $(hdr c2 idempotent-replayed)"
fi

# 9. 正しくないキーは 400
long="$(printf 'k%.0s' $(seq 1 256))"
post d1 '{"title":"キーD"}' ''
post d2 '{"title":"キーD"}' "$long"
post d3 '{"title":"キーD"}' 'has space'
if [ "$(st d1)" = "400" ] && [ "$(st d2)" = "400" ] && [ "$(st d3)" = "400" ] && [ "$(count キーD)" = "0" ]; then
  ok "9. 空・256文字・空白を含むキーは 400"
else
  ng "9. 空・256文字・空白を含むキーは 400" "空: $(st d1)、256文字: $(st d2)、空白: $(st d3)"
fi

# 10. 別のキーなら別のタスク
post e1 '{"title":"キーE"}' key-e1
post e2 '{"title":"キーE"}' key-e2
if [ "$(st e1)" = "201" ] && [ "$(st e2)" = "201" ] && [ "$(count キーE)" = "2" ]; then
  ok "10. 内容が同じでも、キーが違えば別のタスクを作る"
else
  ng "10. 内容が同じでも、キーが違えば別のタスクを作る" "ステータス: $(st e1), $(st e2)、タスクの数: $(count キーE)"
fi

echo
if [ "$FAILED" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$FAILED 個の確認が失敗しました"
  exit 1
fi
