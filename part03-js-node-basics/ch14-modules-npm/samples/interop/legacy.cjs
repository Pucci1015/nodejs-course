// 古い書き方（CommonJS）のライブラリの例（第14章 4節）
exports.add = (a, b) => a + b; // exports.名前 = … の形は、ES Modules から名前付きで import できる
exports.PI = 3.14;

const hidden = {};
hidden.secret = 'computed'; // 実行してみないと分からない形は、名前付きでは import できない
Object.assign(exports, hidden);
