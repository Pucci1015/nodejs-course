// テストの部品: .dockerignore の決まりで、パスが「送らない」になるかを調べる（書き換えなくてよいファイル）
// Docker の決まりを、この練習で使う分だけ写したもの:
//   1行に1つ。# で始まる行と空の行は無視。先頭の / は取る。! で始まる行は「やっぱり送る」
//   * は / 以外の0文字以上、? は / 以外の1文字、** は / を含む0文字以上
//   フォルダに当てはまれば、その中のファイルも当てはまる。後に書いた行が勝つ

function toRegExp(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i] ?? '';
    if (c === '*' && pattern[i + 1] === '*') {
      re += '.*';
      i += 1;
      if (pattern[i + 1] === '/') i += 1;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}(?:/.*)?$`);
}

export function isIgnored(dockerignore: string, filePath: string): boolean {
  let ignored = false;
  for (const raw of dockerignore.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const negate = line.startsWith('!');
    const pattern = (negate ? line.slice(1) : line).replace(/^\/+/, '').replace(/\/+$/, '');
    if (toRegExp(pattern).test(filePath)) ignored = !negate;
  }
  return ignored;
}
