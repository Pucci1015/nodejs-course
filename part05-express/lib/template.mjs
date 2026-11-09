// 練習問題4の模範解答
// 方針: 「トークンに分ける → 木にする（parse） → 木をたどって文字を作る（render）」の3段
//       テンプレートの文字を JavaScript として実行する（eval・new Function）ことはしない
import { escapeHtml } from './mini-html.mjs';

// TemplateError と tokenize は、問題のファイルと同じ
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


const PATH = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

// 追加: フィルタ。名前 → 関数。raw だけは「エスケープしない」という印
const FILTERS = {
  upper: (v) => (v === null || v === undefined ? v : String(v).toUpperCase()),
  length: (v) => (v === null || v === undefined ? 0 : (v.length ?? Object.keys(v).length)),
};

function parsePath(expr, line) {
  if (!PATH.test(expr)) throw new TemplateError(`名前として読めません: ${JSON.stringify(expr)}`, line);
  return expr.split('.');
}

function parseOutput({ expr, line }) {
  const [first, ...rest] = expr.split('|').map((s) => s.trim());
  const filters = rest.map((f) => {
    if (f !== 'raw' && !Object.hasOwn(FILTERS, f)) throw new TemplateError(`知らないフィルタです: ${f}`, line);
    return f;
  });
  return { type: 'output', path: parsePath(first, line), filters, line };
}

// 追加: トークンの並びを木にする。開いたブロック（if・for）をスタックに積んで、閉じたら外す
function parse(tokens) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const add = (node) => (top().inElse ? top().elseChildren : top().children).push(node);

  for (const tok of tokens) {
    if (tok.type === 'text') add({ type: 'text', value: tok.value });
    else if (tok.type === 'output') add(parseOutput(tok));
    else {
      const words = tok.expr.split(/\s+/);
      const [kw] = words;
      if (kw === 'if' && words.length === 2) {
        const node = { type: 'if', path: parsePath(words[1], tok.line), children: [], elseChildren: [], line: tok.line };
        add(node);
        stack.push(node);
      } else if (kw === 'for' && words.length === 4 && words[2] === 'in') {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(words[1]) || words[1] === 'loop') throw new TemplateError(`for の変数名に使えません: ${words[1]}`, tok.line);
        const node = { type: 'for', name: words[1], path: parsePath(words[3], tok.line), children: [], elseChildren: [], line: tok.line };
        add(node);
        stack.push(node);
      } else if (kw === 'else' && words.length === 1) {
        if (stack.length === 1 || top().inElse) throw new TemplateError('else の場所がおかしいです', tok.line);
        top().inElse = true;
      } else if ((kw === 'endif' || kw === 'endfor') && words.length === 1) {
        const want = kw === 'endif' ? 'if' : 'for';
        if (top().type !== want) throw new TemplateError(`${kw} に対応する ${want} がありません`, tok.line);
        stack.pop();
      } else {
        throw new TemplateError(`知らないタグです: {% ${tok.expr} %}`, tok.line);
      }
    }
  }
  if (stack.length > 1) throw new TemplateError(`${top().type} が閉じていません（end${top().type} が無い）`, top().line);
  return root;
}

// 追加: 名前を探す。内側の for の変数から順に。自分のキー（Object.hasOwn）だけをたどる
//       （constructor や __proto__ のような、プロトタイプの先にあるものは見せない）
function lookup(scopes, path) {
  let found = false;
  let value;
  for (let i = scopes.length - 1; i >= 0; i--) {
    if (Object.hasOwn(scopes[i], path[0])) {
      value = scopes[i][path[0]];
      found = true;
      break;
    }
  }
  if (!found) return undefined;
  for (const key of path.slice(1)) {
    if (value === null || value === undefined || !Object.hasOwn(Object(value), key)) return undefined;
    value = value[key];
  }
  return value;
}

const truthy = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)); // 追加: 空の配列は偽（Jinja2 と同じ）

function renderNodes(nodes, scopes) {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') out += node.value;
    else if (node.type === 'output') {
      let v = lookup(scopes, node.path);
      for (const f of node.filters) if (f !== 'raw') v = FILTERS[f](v);
      if (v === null || v === undefined || v === false) continue;
      out += node.filters.includes('raw') ? String(v) : escapeHtml(v); // 修正: ふだんはエスケープする
    } else if (node.type === 'if') {
      out += renderNodes(truthy(lookup(scopes, node.path)) ? node.children : node.elseChildren, scopes);
    } else if (node.type === 'for') {
      const list = lookup(scopes, node.path);
      const items = Array.isArray(list) ? list : [];
      if (items.length === 0) out += renderNodes(node.elseChildren, scopes);
      items.forEach((item, i) => {
        const loop = { index: i + 1, first: i === 0, last: i === items.length - 1 };
        out += renderNodes(node.children, [...scopes, { [node.name]: item, loop }]);
      });
    }
  }
  return out;
}

export function compile(source) {
  const tree = parse(tokenize(source)); // 書き方の誤りは、compile の時点で見つける
  return (data = {}) => renderNodes(tree.children, [data]);
}

export { escapeHtml };
