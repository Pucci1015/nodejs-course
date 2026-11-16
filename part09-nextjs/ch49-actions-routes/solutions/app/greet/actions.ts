'use server';
// 第49章 練習問題3の模範解答: 挨拶を返す Server Action。useActionState から呼ぶ形（前の結果, FormData）

export async function greetAction(_prev: string, formData: FormData): Promise<string> {
  const value = formData.get('name');
  const name = typeof value === 'string' ? value.trim() : '';
  if (name === '') return '名前を入れてください';
  if (name.length > 20) return '名前は 20 文字までです';
  return `こんにちは、${name} さん`;
}
