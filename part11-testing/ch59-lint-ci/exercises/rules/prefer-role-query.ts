// 練習問題5: 「…ByTestId で探す」を見つけて、役割と名前で探すように促す ESLint のルールを書く
// 確かめ方（exercises で）: node --test prefer-role-query.test.ts
import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: '…ByTestId ではなく、役割と名前で探す' },
    messages: { preferRole: '{{name}} ではなく、役割と名前で探す（getByRole など）を使ってください' },
    schema: [],
  },
  create(context) {
    // ここを書く
    void context;
    return {};
  },
};

export default rule;
