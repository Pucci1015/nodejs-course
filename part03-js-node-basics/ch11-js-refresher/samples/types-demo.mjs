// 値と型（第11章 1節）
// 使い方: node types-demo.mjs
//   JavaScript の「型」と「比較」で、Python と違うところを並べて表示する。

const show = (label, value) => console.log(`${label.padEnd(36)} → ${typeof value === 'string' ? JSON.stringify(value) : String(value)}`);

console.log('== typeof ==');
show('typeof 42', typeof 42);
show('typeof 42n', typeof 42n);
show("typeof 'あ'", typeof 'あ');
show('typeof true', typeof true);
show('typeof undefined', typeof undefined);
show('typeof null', typeof null); // 歴史的な理由で 'object'。null の判定は === null で行う
show('typeof {}', typeof {});
show('typeof []', typeof []); // 配列もオブジェクト。配列の判定は Array.isArray
show('Array.isArray([])', Array.isArray([]));
show('typeof (() => {})', typeof (() => {}));

console.log('\n== 数値はすべて 64ビットの浮動小数点数 ==');
show('0.1 + 0.2', 0.1 + 0.2);
show('0.1 + 0.2 === 0.3', 0.1 + 0.2 === 0.3);
show('Number.MAX_SAFE_INTEGER', Number.MAX_SAFE_INTEGER);
show('2 ** 53 + 1', 2 ** 53 + 1); // 正確に表せない
show('2n ** 53n + 1n', 2n ** 53n + 1n); // BigInt なら正確
show('7 / 2', 7 / 2); // Python の 7 / 2 と同じ。整数の割り算（//）は無い
show('Math.trunc(7 / 2)', Math.trunc(7 / 2));
show('-7 % 3', -7 % 3); // Python の -7 % 3 は 2
show('1 / 0', 1 / 0); // Python は ZeroDivisionError
show("Number('12px')", Number('12px'));
show("parseInt('12px', 10)", parseInt('12px', 10));
show('NaN === NaN', NaN === NaN);
show('Number.isNaN(NaN)', Number.isNaN(NaN));

console.log('\n== == と === ==');
show("0 == ''", 0 == '');
show("0 == '0'", 0 == '0');
show("'' == '0'", '' == '0'); // 推移律が成り立たない
show('null == undefined', null == undefined);
show('null === undefined', null === undefined);
show("0 === ''", 0 === '');

console.log('\n== 「偽」になる値（falsy）==');
for (const v of [false, 0, -0, 0n, '', null, undefined, NaN, '0', [], {}]) {
  const label = Array.isArray(v) ? '[]' : typeof v === 'object' && v !== null ? '{}' : typeof v === 'string' ? JSON.stringify(v) : typeof v === 'bigint' ? `${v}n` : Object.is(v, -0) ? '-0' : String(v);
  show(`Boolean(${label})`, Boolean(v));
}

console.log('\n== 文字列は UTF-16 の並び ==');
const s = '𩸽（ほっけ）と🍣';
show('s.length', s.length);
show('[...s].length', [...s].length);
show('s.slice(0, 1)', s.slice(0, 1)); // サロゲートペアの半分
show('[...s][0]', [...s][0]);
show("new TextEncoder().encode(s).length", new TextEncoder().encode(s).length); // UTF-8 のバイト数
