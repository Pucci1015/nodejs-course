'use server';
// 第49章 練習問題5: 題名を変える Server Action（ここに書きます）

/** フォームの結果。エラーの文（無ければ null）と、打った題名 */
export type RenameState = { error: string | null; title: string };

export async function renameTaskAction(_id: number, _version: number, _prev: RenameState, _formData: FormData): Promise<RenameState> {
  throw new Error('まだ書いていません');
}
