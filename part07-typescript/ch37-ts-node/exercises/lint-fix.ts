// 練習問題7: このファイルは tsc のエラーは無いが、ESLint が8つのエラーを出します。直す所は4つの関数で、どれも本当のバグです。
// npx eslint lint-fix.ts で確かめながら、全部直してください。要件は README にあります。
// 確かめ方: node --test lint-fix.test.ts

/** messages を1つずつ、順番に send する。送れた数を返す */
export async function sendAll(messages: string[], send: (m: string) => Promise<void>): Promise<number> {
  let sent = 0;
  messages.forEach(async (m) => {
    await send(m);
    sent += 1;
  });
  return sent;
}

/** ids を1つずつ load して、結果を ids の順に並べて返す */
export async function loadAll(ids: number[], load: (id: number) => Promise<string>): Promise<string[]> {
  const results: string[] = [];
  for (const id of ids) {
    load(id).then((value) => results.push(value));
  }
  return results;
}

/** ms ごとに job を動かす。job が失敗したら onError に渡す。止める関数を返す */
export function every(ms: number, job: () => Promise<void>, onError: (err: unknown) => void): () => void {
  const timer = setInterval(job, ms);
  return () => clearInterval(timer);
}

/** JSON の { "value": 文字列 } から value を取り出す。形が違えば null */
export function valueOf(json: string): string | null {
  const data: any = JSON.parse(json);
  return data.value ?? null;
}
