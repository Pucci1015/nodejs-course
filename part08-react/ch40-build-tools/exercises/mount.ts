// 第40章 練習問題8: 第39章の画面を TypeScript で書き直す（追加のフォームと一覧）

export type Task = { id: number; title: string; status: 'todo' | 'doing' | 'done'; dueDate: string | null; version: number };
export type TaskApi = {
  list(): Promise<Task[]>;
  create(input: { title: string; dueDate: string | null }): Promise<Task>;
};

/** root の中に、フォーム・状態の文・一覧を作り、一覧を読み終えたら解決する */
export async function mountApp(root: HTMLElement, api: TaskApi): Promise<void> {
  throw new Error('まだ書いていません');
}
