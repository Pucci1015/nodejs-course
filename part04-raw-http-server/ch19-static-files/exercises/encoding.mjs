// 練習問題8: Accept-Encoding を読んで、どの圧縮で返すかを決める
// 仕様は README の練習問題8を見てください。
// 確かめる: node --test encoding.test.mjs

export function negotiateEncoding(header, available = ['br', 'gzip']) {
  // ここを書く（下は samples/gzip-demo.mjs と同じ、簡単な決め方です）
  const accept = header ?? '';
  for (const enc of available) {
    if (accept.includes(enc)) return enc;
  }
  return 'identity';
}
