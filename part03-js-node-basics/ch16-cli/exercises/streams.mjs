// 練習問題1で使う。標準出力に2行、標準エラー出力に1行を出す。fail を付けると終了コード 1
// 使い方: node streams.mjs [fail]
console.log('out 1');
console.error('err 1');
console.log('out 2');
process.exitCode = process.argv[2] === 'fail' ? 1 : 0;
