// 7節: as const・keyof typeof・satisfies・テンプレートリテラル型
// 値から型を作る: 状態の一覧を1か所に書き、型はそこから取り出す
const STATUSES = ['todo', 'doing', 'done'] as const;
type Status = (typeof STATUSES)[number]; // 'todo' | 'doing' | 'done'

// satisfies: 「この型に合っているか確かめる。でも、推論された細かい型はそのまま残す」
const LABELS = {
  todo: '未着手',
  doing: '作業中',
  done: '完了',
} satisfies Record<Status, string>;

type LabelKey = keyof typeof LABELS; // 'todo' | 'doing' | 'done'
const key: LabelKey = 'doing';
console.log(LABELS[key], STATUSES.length);

// テンプレートリテラル型: 文字列の形を型にする
type CacheKey = `task:${number}`;
const k1: CacheKey = 'task:42';
console.log(k1);

function isStatus(text: string): text is Status {
  return (STATUSES as readonly string[]).includes(text);
}
console.log(isStatus('done'), isStatus('waiting'));
