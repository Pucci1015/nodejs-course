// よく見る、危ない静的ファイルのサーバ（第19章 2節・4節）
// 使い方: node naive-static.mjs   → http://127.0.0.1:9190/
//   自分の Mac の中で、公開するフォルダ（public）の外が読めてしまうことを確かめる:
//   curl --path-as-is 'http://127.0.0.1:9190/..%2Foutside.txt'
//   （outside.txt は、このフォルダに置いた練習用のファイルです。ほかのサーバに試さないこと）
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const PORT = 9190;
const ROOT = path.join(import.meta.dirname, 'public');

const server = http.createServer(async (req, res) => {
  // 問題1: クエリを取り除かずに、そのまま戻している。問題2: 戻した後の .. を確かめていない
  const file = path.join(ROOT, decodeURIComponent(req.url));
  console.log(`${req.method} ${req.url} → ${file}`);
  try {
    const data = await fs.readFile(file); // 問題3: 大きなファイルも全部メモリに読む
    res.end(data); // 問題4: Content-Type が無い
  } catch (err) {
    res.statusCode = 404; // 問題5: フォルダ（EISDIR）も、読めない（EACCES）も、全部 404
    res.end(`${err.code}\n`); // 問題6: エラーの code を客に見せている
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（公開するフォルダ: ${ROOT}）`));
