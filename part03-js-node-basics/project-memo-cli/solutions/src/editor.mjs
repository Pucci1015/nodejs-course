// エディタでファイルを開き、閉じるまで待つ
import { spawn } from 'node:child_process';
import { MemoError } from './store.mjs';

/**
 * editor は "vim" や "code --wait" のような文字列。空白で分けて、シェルを通さずに起動する。
 * シェルを通さないので、ファイル名に ; や $( ) があってもコマンドとして実行されない（第15章 8.2節）。
 * その代わり、引用符（"..."）や、空白を含むパスは使えない。
 */
export function openEditor(editor, file) {
  const [cmd, ...args] = editor.trim().split(/\s+/);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [...args, file], { stdio: 'inherit' });
    // エディタを使っている間の Ctrl+C は、エディタに任せる（vim などは自分で Ctrl+C を使う）。
    // 端末の Ctrl+C は、memo とエディタの両方に届くので、memo の側では受け流す
    const ignore = () => {};
    process.on('SIGINT', ignore);
    const done = () => process.off('SIGINT', ignore);
    child.on('error', (err) => {
      done();
      reject(err.code === 'ENOENT' ? new MemoError(`エディタが見つかりません: ${cmd}（MEMO_EDITOR か EDITOR で設定してください）`) : err);
    });
    child.on('exit', (code, signal) => {
      done();
      if (code === 0) resolve();
      else reject(new MemoError(`エディタが終了コード ${code ?? signal} で終わりました。メモは変えていません`));
    });
  });
}
