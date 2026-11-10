#!/usr/bin/env node
// memo コマンドの入口。中身は src/cli.mjs
import { main } from '../src/cli.mjs';

// process.exit() ではなく exitCode。書きかけの出力を捨てない（第16章 6節）
process.exitCode = await main(process.argv.slice(2));
