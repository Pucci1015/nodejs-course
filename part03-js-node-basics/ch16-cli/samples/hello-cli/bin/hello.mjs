#!/usr/bin/env node
// npm link すると、どこからでも hello-cli という名前で実行できる（第16章 2節）
// 使い方: node bin/hello.mjs [名前]  /  ./bin/hello.mjs [名前]  /  （npm link の後）hello-cli [名前]
const name = process.argv[2] ?? '世界';
console.log(`こんにちは、${name}`);
console.log('process.argv:', process.argv);
