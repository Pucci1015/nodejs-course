// 練習問題5: SSE のイベントを書く・読む
// 要件は exercises/README.md の問題5です。確かめ方:
//   $ node --test sse-format.test.mjs
// 今のひな形は、ふつうの1行のイベントなら書けて読めますが、仕様どおりではありません。

export function formatEvent({ data, event, id, retry, comment } = {}) {
  let s = '';
  if (event !== undefined) s += `event: ${event}\n`;
  if (data !== undefined) s += `data: ${data}\n`; // ここを書く: 改行、型
  if (id !== undefined) s += `id: ${id}\n`;
  if (retry !== undefined) s += `retry: ${retry}\n`;
  // ここを書く: comment、改行の入った event・id を断る
  return `${s}\n`;
}

export function createEventStreamParser(onEvent, { onRetry } = {}) {
  let buffer = '';
  let ev = { type: 'message', data: '', lastEventId: '' };
  return {
    push(chunk) {
      buffer += chunk;
      const blocks = buffer.split('\n\n'); // ここを書く: \r\n や \r、チャンクの境目
      buffer = blocks.pop();
      for (const block of blocks) {
        for (const l of block.split('\n')) {
          const [field, ...rest] = l.split(':');
          const value = rest.join(':').trim();
          if (field === 'data') ev.data = value;
          if (field === 'event') ev.type = value;
          if (field === 'id') ev.lastEventId = value;
          if (field === 'retry') onRetry?.(Number(value));
        }
        onEvent(ev);
        ev = { type: 'message', data: '', lastEventId: '' };
      }
    },
    end() {},
  };
}

export function parseEventStream(text) {
  const events = [];
  let retry;
  const p = createEventStreamParser((e) => events.push(e), { onRetry: (ms) => (retry = ms) });
  p.push(text);
  p.end();
  return { events, retry };
}
