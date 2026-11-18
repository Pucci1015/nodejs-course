// 第63章 練習問題2: ダウンロードの名前を決める Content-Disposition（本文 6.1節）

/** encodeURIComponent が残す ! ' ( ) * も %XX にする（RFC 5987 の決まり。本文 4.2節の enc と同じ） */
function enc(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function contentDisposition(fileName: string, options: { inline?: boolean } = {}): string {
  // どちらの形でも困る文字（/ と制御文字）を、先に _ にする
  // eslint-disable-next-line no-control-regex -- 制御文字（U+0000〜U+001F と U+007F）を探すため
  const cleaned = fileName.replace(/[/\x00-\x1f\x7f]/g, '_') || 'file';
  // 古いブラウザ向けの filename: 表示できる ASCII（空白〜~）のうち、" と \ 以外だけを残す
  const ascii = cleaned.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const type = options.inline === true ? 'inline' : 'attachment';
  return `${type}; filename="${ascii}"; filename*=UTF-8''${enc(cleaned)}`;
}
