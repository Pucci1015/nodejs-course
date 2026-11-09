// 練習問題4: 小さなテンプレートエンジンを作る（Jinja2 の、ごく一部）
// テスト: node --test template.test.mjs
//
//   const render = compile('<h1>{{ title }}</h1>{% for t in tasks %}<li>{{ t.title }}</li>{% endfor %}');
//   render({ title: '一覧', tasks: [{ title: 'A & B' }] })   → '<h1>一覧</h1><li>A &amp; B</li>'
//
// 決まり（README の問題4に詳しく書いてある）
//   {{ 名前 }}  {{ 名前.名前 }}   値をエスケープして出す。無い名前・null・undefined・false は何も出さない
//   {{ 名前 | raw }}  {{ 名前 | upper }}  {{ 名前 | length }}   フィルタ。いくつでもつなげる
//   {% if 名前 %} … {% else %} … {% endif %}       空の配列も「偽」
//   {% for x in 名前 %} … {% else %} … {% endfor %}  else は配列が空のとき。loop.index・loop.first・loop.last が使える
//   {# コメント #}                                  何も出さない
//   書き方がおかしいときは、行番号の付いた TemplateError を投げる
import { escapeHtml } from '../samples/mini-html.mjs';

export class TemplateError extends Error {
  constructor(message, line) {
    super(`${line} 行目: ${message}`);
    this.name = 'TemplateError';
    this.line = line;
  }
}

/**
 * テンプレートの文字を、トークンの配列に分ける（ここは、できている）
 *   { type: 'text', value, line }     ふつうの文字
 *   { type: 'output', expr, line }    {{ … }} の中身（前後の空白は取る）
 *   { type: 'tag', expr, line }       {% … %} の中身
 */
export function tokenize(source) {
  const tokens = [];
  const re = /\{\{|\{%|\{#/g;
  let pos = 0;
  let line = 1;
  const countLines = (s) => (s.match(/\n/g) ?? []).length;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    const text = source.slice(pos, m.index);
    if (text) tokens.push({ type: 'text', value: text, line });
    line += countLines(text);
    const close = { '{{': '}}', '{%': '%}', '{#': '#}' }[m[0]];
    const end = source.indexOf(close, m.index + 2);
    if (end === -1) throw new TemplateError(`${m[0]} が閉じていません`, line);
    const inner = source.slice(m.index + 2, end);
    if (m[0] === '{{') tokens.push({ type: 'output', expr: inner.trim(), line });
    if (m[0] === '{%') tokens.push({ type: 'tag', expr: inner.trim(), line });
    line += countLines(inner);
    pos = end + 2;
    re.lastIndex = pos;
  }
  if (pos < source.length) tokens.push({ type: 'text', value: source.slice(pos), line });
  return tokens;
}

/** テンプレートを読み、data を受け取って文字列を返す関数を作る */
export function compile(source) {
  // ここを書く（いまは、{{ 名前 }} を data の値でそのまま置き換えるだけ。エスケープも if も for も無い）
  return (data = {}) => source.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => data[name]);
}

export { escapeHtml };
