// 第27章 練習問題2の模範解答（ch27-realtime/solutions/sse-format.mjs）のコピー。そのまま使う
// SSE のイベントを書く・読む（HTML Living Standard の「Server-sent events」9.2）

const NEWLINE = /\r\n|\r|\n/;

/**
 * 1つのイベントを、text/event-stream の形にする
 * @param {{ data?: string, event?: string, id?: string | number, retry?: number, comment?: string }} e
 */
export function formatEvent({ data, event, id, retry, comment } = {}) {
  let s = '';
  // 追加: 1行にしか書けない項目に改行が入ると、そこから先が「別の行」として読まれてしまう（偽のイベントを作られる）
  const oneLine = (name, v) => {
    if (/[\r\n]/.test(v)) throw new TypeError(`${name} に改行は入れられません`);
    return v;
  };
  if (comment !== undefined) for (const line of String(comment).split(NEWLINE)) s += `: ${line}\n`;
  if (event !== undefined) s += `event: ${oneLine('event', String(event))}\n`;
  if (data !== undefined) {
    if (typeof data !== 'string') throw new TypeError('data は文字列にしてください（オブジェクトは JSON.stringify してから）');
    for (const line of data.split(NEWLINE)) s += `data: ${line}\n`; // 修正: 改行ごとに data: の行を分ける
  }
  if (id !== undefined) {
    const v = oneLine('id', String(id));
    if (v.includes('\0')) throw new TypeError('id に NULL は入れられません'); // 読む側が捨ててしまう
    s += `id: ${v}\n`;
  }
  if (retry !== undefined) {
    if (!Number.isInteger(retry) || retry < 0) throw new TypeError('retry は 0 以上の整数（ミリ秒）です');
    s += `retry: ${retry}\n`;
  }
  return `${s}\n`;
}

/**
 * text/event-stream を少しずつ読む。届いた文字列を push し、最後に end を呼ぶ
 * @param {(e: { type: string, data: string, lastEventId: string }) => void} onEvent
 * @param {{ onRetry?: (ms: number) => void }} [options]
 */
export function createEventStreamParser(onEvent, { onRetry } = {}) {
  let buffer = '';
  let first = true;
  let data = '';
  let type = '';
  let lastEventId = ''; // 修正: id は、次のイベントにも引き継がれる（イベントごとに消さない）

  function line(l) {
    if (l === '') {
      // 空の行: イベントを送る。data が無ければ、何も送らずに捨てる
      if (data !== '') onEvent({ type: type || 'message', data: data.slice(0, -1), lastEventId });
      data = '';
      type = '';
      return;
    }
    if (l.startsWith(':')) return; // コメント
    const i = l.indexOf(':');
    const field = i === -1 ? l : l.slice(0, i); // 追加: : が無い行は、行全体が名前で、値は空
    let value = i === -1 ? '' : l.slice(i + 1);
    if (value.startsWith(' ')) value = value.slice(1); // 修正: 取るのは最初の空白1つだけ
    if (field === 'event') type = value;
    else if (field === 'data') data += `${value}\n`;
    else if (field === 'id') {
      if (!value.includes('\0')) lastEventId = value;
    } else if (field === 'retry') {
      if (/^[0-9]+$/.test(value)) onRetry?.(Number(value));
    } // 知らない名前は無視
  }

  return {
    push(chunk) {
      buffer += chunk;
      if (first && buffer.length > 0) {
        if (buffer.charCodeAt(0) === 0xfeff) buffer = buffer.slice(1); // 先頭の BOM は捨てる
        first = false;
      }
      // 修正: 行の終わりは \r\n・\n・\r のどれでもよい。ただし、最後が \r なら、次に \n が来るかもしれないので待つ
      for (;;) {
        const m = /\r\n|\n|\r/.exec(buffer);
        if (!m) break;
        if (m[0] === '\r' && m.index === buffer.length - 1) break;
        line(buffer.slice(0, m.index));
        buffer = buffer.slice(m.index + m[0].length);
      }
    },
    end() {
      if (buffer.endsWith('\r')) {
        line(buffer.slice(0, -1));
        buffer = '';
      }
      // 空の行で終わっていないイベントは、送らずに捨てる（途中で切れたもの）
      buffer = '';
      data = '';
      type = '';
    },
  };
}

/** 全部そろった文字列を読む（テストや、小さなものを読むとき用） */
export function parseEventStream(text) {
  const events = [];
  let retry;
  const p = createEventStreamParser((e) => events.push(e), { onRetry: (ms) => (retry = ms) });
  p.push(text);
  p.end();
  return { events, retry };
}
