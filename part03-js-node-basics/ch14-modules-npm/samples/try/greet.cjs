// 第14章 3節で書く、CommonJS で書き直した greet の完成形（use-greet.cjs と mix.mjs から読み込まれる）
const DEFAULT_NAME = 'alice';

function greet(name = DEFAULT_NAME) {
  return `こんにちは、${name}さん`;
}

function shout(text) {
  return `${text}！`;
}

module.exports = { DEFAULT_NAME, greet, shout };
