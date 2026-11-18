// 第59章 5節: 書き方のそろっていないファイル（Prettier で整える）
export const   colors = {red:"#c00",green : '#0a0' ,
  blue:'#00c'}
export function pick( name:keyof typeof colors ){ return colors[ name ] }
