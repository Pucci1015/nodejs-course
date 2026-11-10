// 第16章 5.1節で書く、標準出力と標準エラー出力を使い分けるプログラムの完成形
// 使い方（~/dev/part03/ch16-cli で）: node samples/out-err.mjs > result.txt
const fruits = ['りんご', 'みかん', 'ぶどう'];
for (const [i, fruit] of fruits.entries()) {
  console.error(`処理中… ${i + 1}/${fruits.length}`); // 進み具合は人に向けたもの → 標準エラー出力
  console.log(fruit); // 結果 → 標準出力
}
console.error('完了しました');
