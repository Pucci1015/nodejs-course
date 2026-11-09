// 練習問題9 の模範解答: Accept-Language を見て、日本語か英語であいさつする
// 使い方: node greet-server.mjs        curl -H 'Accept-Language: en-US,en;q=0.9,ja;q=0.8' http://127.0.0.1:8106/
import http from 'node:http';

const messages = { ja: 'こんにちは', en: 'Hello' };

// 'ja,en-US;q=0.9' → 'ja' か 'en'（どちらも無ければ 'ja'）
function chooseLanguage(header) {
  if (header === undefined) return 'ja';
  let best = 'ja';
  let bestQ = 0;
  for (const item of header.split(',')) {
    const [tag, qText] = item.trim().split(';q=');
    const q = qText === undefined ? 1 : Number(qText); // q を省略したら 1
    const lang = tag.toLowerCase().split('-')[0]; // en-US → en
    // 対応している言語で、今までより q が大きいものを選ぶ（同じなら先に書かれた方）
    if (messages[lang] !== undefined && q > bestQ) {
      best = lang;
      bestQ = q;
    }
  }
  return best;
}

const server = http.createServer((req, res) => {
  const lang = chooseLanguage(req.headers['accept-language']);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Language', lang);
  res.setHeader('Vary', 'Accept-Language'); // Accept-Language によって中身が変わる
  res.end(`${messages[lang]}\n`);
});

server.listen(8106, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8106/ で待ち受けています');
});
