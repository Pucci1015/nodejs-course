// TanStack Query のフック（第43章 3〜7節）
// ログインしている人（useMe）とログアウト（useLogout）。会議室と予約のフックは、第69章で足す
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, logout } from './auth.ts';

/**
 * ログインしている人。サーバが知っていること（サーバの状態）なので、Context ではなく TanStack Query に置く（第44章 6節）。
 * どの部品からでも useMe() で読め、ログイン・ログアウトしたら、このキャッシュを書き換えるだけで、全部の画面が変わる
 */
export const meKey = ['me'] as const;

export function useMe() {
  return useQuery({ queryKey: meKey, queryFn: ({ signal }) => getMe(signal), staleTime: 60_000 });
}

/** ログアウト。前の人のデータがキャッシュに残らないように全部消してから、「ログインしていない」にする */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== meKey[0] });
      queryClient.setQueryData(meKey, null);
    },
  });
}
