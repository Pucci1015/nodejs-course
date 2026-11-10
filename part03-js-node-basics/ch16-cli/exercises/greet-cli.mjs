// 練習問題1: parseArgs を使って、あいさつする CLI を作ってください。
// 要件は README と greet-cli.test.mjs にあります。
// 使い方: node greet-cli.mjs [名前...] [--shout] [--times 回数] [--help]
// 確かめ方: node --test greet-cli.test.mjs
import { parseArgs } from 'node:util';

const USAGE = '使い方: node greet-cli.mjs [名前...] [-s|--shout] [-t|--times 回数] [-h|--help]';

// ここを書く
