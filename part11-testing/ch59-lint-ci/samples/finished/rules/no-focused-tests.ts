// 第59章 4節: 自分で作る ESLint のルール。test.only・describe.only などを残さない
// node:test では、--test-only を付けないと .only は効かないが、Vitest・Playwright では、ほかのテストが黙って飛ばされる
import type { Rule } from 'eslint';

const TEST_FUNCTIONS = new Set(['test', 'it', 'describe', 'suite']);

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'test.only・describe.only などを残さない' },
    messages: { focused: '{{name}}.only が残っています。ほかのテストが動かなくなります' },
    schema: [],
  },
  create(context) {
    return {
      // 関数の呼び出し（CallExpression）を見つけるたびに呼ばれる
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          TEST_FUNCTIONS.has(callee.object.name) &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'only'
        ) {
          context.report({ node: callee.property, messageId: 'focused', data: { name: callee.object.name } });
        }
      },
    };
  },
};

export default rule;
