// 練習問題2 の模範解答: ページの URL を基準に、リンクを完全な URL に直し、同じオリジンかを表示する
// 使い方: node link-check.mjs ページの URL リンク ...
//   例: node link-check.mjs https://example.com/docs/guide/ logo.png //cdn.example.net/lib.js
const page = new URL(process.argv[2]);

for (const href of process.argv.slice(3)) {
  const url = new URL(href, page); // ページの URL を基準に、相対 URL を解決する
  const same = url.origin === page.origin ? '同じオリジン' : '別のオリジン';
  console.log(`${url.href.padEnd(45)} ${same}`);
}
