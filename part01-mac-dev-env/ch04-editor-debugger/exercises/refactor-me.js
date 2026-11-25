// 練習問題2: VS Code の機能を使って、このファイルを読みやすく書き換える
// 書き換えの前後で、node exercises/refactor-me.js の出力が変わらないこと（~/dev/ch04 で動かす）。

var d = [
  { t: '牛乳を買う', p: 1, f: true },
  { t: 'レポートを書く', p: 3, f: false },
  { t: '部屋を掃除する', p: 2, f: false },
  { t: '発表の準備', p: 5, f: false },
  { t: '本を返す', p: 4, f: true },
];

function show() {
  var n = 0;
  for (var i = 0; i < d.length; i++) {
    if (d[i].f == false) {
      console.log('- ' + d[i].t + ' (優先度 ' + d[i].p + ')');
      n = n + 1;
    }
  }
  console.log('未完了: ' + n + '件');

  var h = 0;
  for (var i = 0; i < d.length; i++) {
    if (d[i].f == false && d[i].p >= 3) {
      h = h + 1;
    }
  }
  console.log('うち優先度3以上: ' + h + '件');
}

show();
