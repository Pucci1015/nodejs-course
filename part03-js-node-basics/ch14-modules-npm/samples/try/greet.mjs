// 第14章 2.1節で書く、ES Modules で export するファイルの完成形（use-greet.mjs から読み込まれる）
export const DEFAULT_NAME = 'alice';

export function greet(name = DEFAULT_NAME) {
  return `こんにちは、${name}さん`;
}

export default function shout(text) {
  return `${text}！`;
}
