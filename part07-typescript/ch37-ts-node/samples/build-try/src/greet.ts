// 1.3節: ビルドを試す小さなモジュール
export type Lang = 'ja' | 'en';

export function greet(name: string, lang: Lang = 'ja'): string {
  if (name === '') throw new Error('名前が空です');
  return lang === 'ja' ? `こんにちは、${name}さん` : `Hello, ${name}`;
}
