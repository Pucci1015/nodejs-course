// 3節: 関数の型。引数には必ず型を書く。戻り値は推論に任せてもよいが、書くと間違いに早く気づける
function add(a: number, b: number): number {
  return a + b;
}

// ? を付けた引数は、渡さなくてよい（渡さないと undefined）
function greet(name: string, polite?: boolean): string {
  return polite ? `${name} さん、こんにちは` : `やあ、${name}`;
}

// 決まりの値を書いた引数も、渡さなくてよい。型は値から推論される（times: number）
function repeatText(text: string, times = 2): string {
  return text.repeat(times);
}

// アロー関数も同じように書く
const double = (n: number): number => n * 2;

// 何も返さない関数の戻り値は void
function log(message: string): void {
  console.log(`[log] ${message}`);
}

// 関数を受け取る引数の型は「(引数) => 戻り値」と書く
function applyTwice(n: number, fn: (x: number) => number): number {
  return fn(fn(n));
}

log(String(add(1, 2)));
log(greet('alice'));
log(greet('bob', true));
log(repeatText('ね'));
log(String(applyTwice(3, double)));
// map に渡したアロー関数の n は、配列の型から number と推論される（書かなくてよい）
log(String([1, 2, 3].map((n) => n * 10)));
