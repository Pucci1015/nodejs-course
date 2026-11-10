#!/usr/bin/env node
// 第16章 2.1節で書く、シバン付きのファイルの完成形
// 使い方（~/dev/part03/ch16-cli で）: chmod +x samples/hi.mjs → ./samples/hi.mjs
console.log('こんにちは。node と打たずに動きました');
console.log('引数:', process.argv.slice(2));
