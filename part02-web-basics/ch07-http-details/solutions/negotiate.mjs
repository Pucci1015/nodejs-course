// 練習問題11 の模範解答: Accept-Encoding から圧縮方式を選ぶ
// 確かめ方（~/dev/ch07/exercises で）: MODULE=../solutions/negotiate.mjs node --test negotiate.test.mjs

// 'gzip;q=0.8, br' → { gzip: 0.8, br: 1 }（方式の名前は小文字にする）
function parseAccept(header) {
  const prefs = {};
  for (const item of header.split(',')) {
    const parts = item.split(';');
    const name = parts[0].trim().toLowerCase();
    if (name === '') continue;
    let q = 1; // q を省略したら 1
    for (let i = 1; i < parts.length; i++) {
      const param = parts[i].trim().toLowerCase();
      if (param.startsWith('q=')) q = Number(param.slice(2));
    }
    if (Number.isNaN(q)) q = 0; // q=abc のような壊れた値は「受け入れない」とみなす
    prefs[name] = q;
  }
  return prefs;
}

// available はサーバが使える方式（好む順）。圧縮しないなら 'identity'、どれも受け入れられないなら null
export function chooseEncoding(acceptEncoding, available = ['br', 'gzip']) {
  if (acceptEncoding === undefined || acceptEncoding.trim() === '') return 'identity';
  const prefs = parseAccept(acceptEncoding);

  // ある方式の q: 書かれていればその値、無ければ * の値、* も無ければ 0
  // ただし identity は、断られない限り受け入れるので 0.001（他に受け入れられる方式があればそちらが勝つ）
  function qOf(name) {
    if (prefs[name] !== undefined) return prefs[name];
    if (prefs['*'] !== undefined) return prefs['*'];
    if (name === 'identity') return 0.001;
    return 0;
  }

  let best = null;
  let bestQ = 0;
  // サーバが使える方式（好む順）を見てから、最後に identity を見る
  for (const name of available.concat(['identity'])) {
    const q = qOf(name);
    if (q > bestQ) { // 「より大きいとき」だけ入れ替えるので、同じ q なら先に見た（サーバが好む）方が残る
      best = name;
      bestQ = q;
    }
  }
  return best;
}
