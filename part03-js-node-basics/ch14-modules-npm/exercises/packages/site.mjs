// 練習問題6: tldts を使って、URL の「登録できるドメイン」と「同じサイトか」を判定してください。
// 要件は README と site.test.mjs にあります。このフォルダ（packages）で npm install tldts をしてから作ります。
// 確かめ方（exercises フォルダで）: node --test site.test.mjs
// ここで tldts を import する

/** URL の登録できるドメイン（IP アドレスや localhost なら、ホスト名そのもの） */
export function registrableDomain(url) {
  // ここを書く
}

/** 2つの URL が同じサイト（スキーム + 登録できるドメイン）なら true */
export function sameSite(a, b) {
  // ここを書く
}
