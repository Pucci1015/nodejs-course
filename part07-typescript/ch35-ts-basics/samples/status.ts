// 7節: リテラル型とユニオン型。「この3つの文字列のどれか」を型にする
type Status = 'todo' | 'doing' | 'done';

function label(status: Status): string {
  switch (status) {
    case 'todo':
      return '未着手';
    case 'doing':
      return '作業中';
    case 'done':
      return '完了';
  }
}

let s: Status = 'todo';
console.log(label(s));
s = 'done';
console.log(label(s));

// as const: 値を「書いたとおりの、変わらない値」にする
const DEFAULTS = { status: 'todo', limit: 20 } as const; // { readonly status: 'todo'; readonly limit: 20 }
console.log(label(DEFAULTS.status));
