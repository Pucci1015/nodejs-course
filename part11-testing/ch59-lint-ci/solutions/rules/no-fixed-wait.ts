// 練習問題8の模範解答: テストの中の「決まった時間だけ待つ」を見つける ESLint のルール
// 確かめ方（exercises で）: MODULE=../solutions/rules/no-fixed-wait.ts node --test no-fixed-wait.test.ts
import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'テストの中で、決まった時間だけ待たない' },
    messages: {
      sleep: '決まった時間（{{ms}}ms）待つ代わりに、findBy… や await expect(…) のように、そうなるまで待つ書き方にしてください',
      waitForTimeout: 'page.waitForTimeout は使わず、await expect(ロケーター)… で、そうなるまで待ってください',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;

        // 追加: page.waitForTimeout(…)（Playwright の、決まった時間待つ関数）
        if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier' && callee.property.name === 'waitForTimeout') {
          context.report({ node, messageId: 'waitForTimeout' });
          return;
        }

        // 追加: setTimeout(…) を見つけたら、いちばん近い外側の関数を探す
        if (callee.type !== 'Identifier' || callee.name !== 'setTimeout') return;
        const ancestors = context.sourceCode.getAncestors(node);
        const fn = ancestors.findLast((a) => a.type === 'ArrowFunctionExpression' || a.type === 'FunctionExpression');
        if (fn === undefined) return;

        // 追加: その関数が new Promise(…) の1つ目の引数（executor）なら、「決まった時間だけ待つ Promise」
        const parent = ancestors[ancestors.indexOf(fn) - 1];
        if (
          parent?.type === 'NewExpression' &&
          parent.callee.type === 'Identifier' &&
          parent.callee.name === 'Promise' &&
          parent.arguments[0] === fn
        ) {
          const delay = node.arguments[1];
          const ms = delay === undefined ? '0' : context.sourceCode.getText(delay);
          context.report({ node: parent, messageId: 'sleep', data: { ms } });
        }
      },
    };
  },
};

export default rule;
