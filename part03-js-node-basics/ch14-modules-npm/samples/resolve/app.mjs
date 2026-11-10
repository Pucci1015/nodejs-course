// モジュールの名前が、どのファイルになるか（第14章 5節）
// 使い方: node app.mjs   （samples/resolve フォルダで）
import { createRequire } from 'node:module';
import { format } from 'tiny-lib'; // パッケージ名だけ → node_modules/tiny-lib の exports の "."
import { shout } from 'tiny-lib/utils'; // exports の "./utils"
import { appName } from '#config'; // 自分の package.json の "imports"

const short = (url) => url.replace(/^.*\/samples\//, '…/samples/');

console.log('1. import した tiny-lib     :', format);
console.log('   require した tiny-lib    :', createRequire(import.meta.url)('tiny-lib').format);
console.log('2. tiny-lib/utils の shout  :', shout('hello'));
console.log('3. #config の appName       :', appName);

console.log('4. それぞれの名前が指すファイル（import.meta.resolve）:');
for (const name of ['tiny-lib', 'tiny-lib/utils', 'tiny-lib/package.json', '#config', 'node:fs', './app.mjs']) {
  console.log(`   ${name.padEnd(22)} → ${short(import.meta.resolve(name))}`);
}

console.log('5. exports に無いものは、ファイルがあっても読めない:');
for (const name of ['tiny-lib/lib/internal.mjs', 'tiny-lib/index.mjs', 'no-such-lib']) {
  try {
    await import(name);
  } catch (err) {
    console.log(`   ${name.padEnd(26)} → ${err.code}`);
  }
}
