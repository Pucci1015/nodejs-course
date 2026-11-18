// 練習問題5の模範解答: 「…ByTestId で探す」を見つけて、役割と名前で探すように促す ESLint のルール
// 確かめ方（exercises で）: MODULE=../solutions/rules/prefer-role-query.ts node --test prefer-role-query.test.ts
import type { Rule } from 'eslint';

// 追加: get・query・find、All があってもなくても、ByTestId で終わる名前
const TEST_ID_QUERY = /^(?:get|query|find)(?:All)?ByTestId$/;

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: '…ByTestId ではなく、役割と名前で探す' },
    messages: { preferRole: '{{name}} ではなく、役割と名前で探す（getByRole など）を使ってください' },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        // 追加: getByTestId(…) なら関数の名前そのもの、screen.getByTestId(…) なら . の後ろの名前を見る
        const callee = node.callee;
        const target =
          callee.type === 'Identifier'
            ? callee
            : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
              ? callee.property
              : undefined;
        if (target && TEST_ID_QUERY.test(target.name)) {
          context.report({ node: target, messageId: 'preferRole', data: { name: target.name } });
        }
      },
    };
  },
};

export default rule;
