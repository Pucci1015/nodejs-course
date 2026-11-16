// 練習問題3: 接続を借りて必ず返す withClient と、それを使う withTransaction を書いてください。
// 要件は README にあります。
// 確かめ方: node --test with-client.test.mjs

// プールから接続を1本借り、fn(client) を呼び、その戻り値を返す。成功しても失敗しても、接続を返す
export async function withClient(pool, fn) {
  // ここを書く
}

// withClient を使って、fn(client) をトランザクションの中で呼ぶ。失敗したら ROLLBACK して投げ直す
export async function withTransaction(pool, fn) {
  // ここを書く
}
