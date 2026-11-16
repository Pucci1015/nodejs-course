// 第40章 練習問題7: virtual:build-info という「ファイルの無いモジュール」を作る Vite のプラグイン
import type { Plugin } from 'vite';

export function buildInfo({ now = () => new Date() }: { now?: () => Date } = {}): Plugin {
  return {
    name: 'build-info',
    // ここに configResolved・resolveId・load を書く
  };
}
