// 練習問題7 の模範解答。ESLint が見つけた4つの関数のバグを直した

/** messages を1つずつ、順番に send する。送れた数を返す */
export async function sendAll(messages: string[], send: (m: string) => Promise<void>): Promise<number> {
  let sent = 0;
  // 修正: forEach は、渡した async 関数の Promise を待たない（no-misused-promises）。for … of で1つずつ await する
  for (const m of messages) {
    await send(m);
    sent += 1;
  }
  return sent;
}

/** ids を1つずつ load して、結果を ids の順に並べて返す */
export async function loadAll(ids: number[], load: (id: number) => Promise<string>): Promise<string[]> {
  // 修正: then だけで待っていなかった（no-floating-promises）。Promise.all で全部を待ち、ids の順のまま受け取る
  return Promise.all(ids.map((id) => load(id)));
}

/** ms ごとに job を動かす。job が失敗したら onError に渡す。止める関数を返す */
export function every(ms: number, job: () => Promise<void>, onError: (err: unknown) => void): () => void {
  // 修正: setInterval は渡した関数の Promise を見ない（no-misused-promises）。失敗を catch で onError に渡す
  const timer = setInterval(() => {
    job().catch(onError);
  }, ms);
  return () => clearInterval(timer);
}

/** JSON の { "value": 文字列 } から value を取り出す。形が違えば null */
export function valueOf(json: string): string | null {
  // 修正: any をやめて unknown にし、確かめてから読む（no-explicit-any・no-unsafe-*）
  const data: unknown = JSON.parse(json);
  if (typeof data === 'object' && data !== null && 'value' in data && typeof data.value === 'string') return data.value;
  return null;
}
