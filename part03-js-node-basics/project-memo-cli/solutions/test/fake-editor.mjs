// テストで使う「エディタ」。開いたファイルの最後に1行足して終わる
// FAKE_EDITOR_MODE=noop なら何もしない、fail なら終了コード 1 で終わる、replace なら FAKE_EDITOR_TEXT で中身を置き換える
import fs from 'node:fs';

const file = process.argv.at(-1);
// node --test は、test フォルダの中の .mjs を全部テストとして動かすので、このファイルも動かされる。
// そのとき（メモのファイルを渡されていないとき）は何もしない
if (!file.endsWith('.md')) process.exit(0);
const mode = process.env.FAKE_EDITOR_MODE ?? 'append';
if (mode === 'fail') process.exit(1);
if (mode === 'append') fs.appendFileSync(file, 'エディタで足した行\n');
if (mode === 'replace') fs.writeFileSync(file, process.env.FAKE_EDITOR_TEXT ?? '');
