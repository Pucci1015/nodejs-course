// 第40章 8節: virtual:greeting の型（tsc は、プラグインが作るモジュールを知らないので、ここで教える）
declare module 'virtual:greeting' {
  export const greeting: string;
}
