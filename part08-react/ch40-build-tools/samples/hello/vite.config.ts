// 第40章 8節: 小さなプラグイン。virtual:greeting という「ファイルの無いモジュール」を作る
import { defineConfig, type Plugin } from 'vite';

function greeting(): Plugin {
  return {
    name: 'greeting',
    // import 'virtual:greeting' を見つけたら、「これは自分が作るモジュール」と名前を返す
    resolveId(id) {
      return id === 'virtual:greeting' ? '\0virtual:greeting' : undefined;
    },
    // その名前のモジュールの中身（JavaScript のコード）を、文字列で返す
    load(id) {
      if (id !== '\0virtual:greeting') return undefined;
      return `export const greeting = ${JSON.stringify(`ビルドした時刻: ${new Date().toLocaleString('ja-JP')}`)};`;
    },
  };
}

export default defineConfig({
  plugins: [greeting()],
});
