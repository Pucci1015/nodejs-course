// テストの部品: TypeScript の型の確かめ（tsc と同じもの）を、テストの中から動かす。書き換えなくてよいファイル
// typeErrors([ファイル, …]) は、そのファイル（と、そこから import しているファイル）の型のエラーを、文字列の配列で返す
// 設定は、ファイルのフォルダから上にたどって最初に見つかった tsconfig.json を使う
import path from 'node:path';
import ts from 'typescript';

export function typeErrors(files: string[]): string[] {
  const dir = path.dirname(files[0] ?? '.');
  const configPath = ts.findConfigFile(dir, ts.sys.fileExists);
  if (configPath === undefined) throw new Error(`tsconfig.json が見つかりません: ${dir}`);
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath));
  const program = ts.createProgram(files, options);
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    if (d.file === undefined || d.start === undefined) return `error TS${d.code}: ${message}`;
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
    const name = path.relative(process.cwd(), d.file.fileName);
    return `${name}(${line + 1},${character + 1}): error TS${d.code}: ${message}`;
  });
}

/** basics.ts → 同じフォルダの basics.check.ts */
export function checkFileOf(file: string): string {
  return file.replace(/\.ts$/, '.check.ts');
}
