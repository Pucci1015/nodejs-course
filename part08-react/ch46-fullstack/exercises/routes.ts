// 第46章 練習問題3: URL のパスから、どのページかを決める（本文2.2節）
export type Route =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'task'; id: number }
  | { name: 'redirect'; to: string }
  | { name: 'not-found' };

export function matchRoute(pathname: string): Route {
  throw new Error('まだ書いていません');
}
