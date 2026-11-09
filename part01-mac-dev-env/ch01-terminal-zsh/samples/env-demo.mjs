// 環境変数が子プロセス（node）に引き継がれるかを確かめるサンプル
// 試し方（第2章で Node.js を入れた後）:
//   $ GREETING=hello                 # シェル変数（export していない）
//   $ node env-demo.mjs              # → undefined
//   $ export GREETING=hello
//   $ node env-demo.mjs              # → hello
//   $ GREETING=こんにちは node env-demo.mjs   # そのコマンドだけに渡す
//   $ PORT=8080 node env-demo.mjs

console.log('GREETING =', process.env.GREETING);

// 環境変数は常に「文字列」。数値として使うときは変換が必要
const port = Number(process.env.PORT ?? 3000);
console.log('PORT     =', port, `(型: ${typeof port})`);

// 子プロセスの中で環境変数を変えても、親のシェルには影響しない
process.env.GREETING = 'changed in node';
console.log('node の中で変更しました。シェルに戻って echo $GREETING で確かめてください');
