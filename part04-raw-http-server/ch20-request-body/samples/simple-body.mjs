// いちばん簡単な、ボディを全部読む関数（第20章 2節）
// 上限が無いので、そのままでは使えない。練習問題2で、上限と Content-Type の確かめ方を足す
export async function readBodySimple(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk); // チャンクは Buffer
  return Buffer.concat(chunks).toString('utf8'); // 全部つないでから、文字に戻す
}
