// 第40章 練習問題7の模範解答: virtual:build-info という「ファイルの無いモジュール」を作る Vite のプラグイン
import type { Plugin } from 'vite';

const ID = 'virtual:build-info';
const RESOLVED = '\0' + ID; // \0 を付けると、ほかのプラグインが「本物のファイル」と思って触らない

export function buildInfo({ now = () => new Date() }: { now?: () => Date } = {}): Plugin {
  let mode = 'development';
  return {
    name: 'build-info',
    configResolved(config) {
      mode = config.mode;
    },
    resolveId(id) {
      return id === ID ? RESOLVED : undefined;
    },
    load(id) {
      if (id !== RESOLVED) return undefined;
      return `export const builtAt = ${JSON.stringify(now().toISOString())};\nexport const mode = ${JSON.stringify(mode)};\n`;
    },
  };
}
