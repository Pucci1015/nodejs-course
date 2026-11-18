// 練習問題2で lint されるファイル（書き換えなくてよい）
export function greet(name) {
  let message = `こんにちは、${name}さん`;
  if (name == '') {
    console.log('名前がありません');
  }
  return message;
}
