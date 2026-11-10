// npm install のときに実行される。ここでは、npm を実行したフォルダに小さなファイルを書くだけ。
// 本物の悪意あるパッケージなら、ここで秘密の情報（~/.ssh、環境変数のトークン）を盗むこともできる。
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(process.env.INIT_CWD ?? process.cwd(), 'POSTINSTALL-RAN.txt');
fs.writeFileSync(file, `postinstall が ${new Date().toISOString()} に実行された\n`);
console.log('hello-postinstall: postinstall が実行された');
