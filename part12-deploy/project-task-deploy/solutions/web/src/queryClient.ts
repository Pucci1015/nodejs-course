// 追加（第10部）: キャッシュ（QueryClient）を作る。main.tsx とテストが同じものを使う
// どこかの API が 401 を返したら（セッションが切れた）、「ログインしていない」にする。ログインが要るページは、ログインのページへ移る
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/client.ts';
import { meKey } from './api/queries.ts';

export function createQueryClient({ retry = true }: { retry?: boolean } = {}): QueryClient {
  const onError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) queryClient.setQueryData(meKey, null);
  };
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 10_000, // 10 秒は「新しい」とみなす（SSE が変化を知らせてくれる）
        // 4xx（401・404 など）は、何回送り直しても同じなので、送り直さない
        retry: retry ? (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2 : false,
      },
    },
  });
  return queryClient;
}
