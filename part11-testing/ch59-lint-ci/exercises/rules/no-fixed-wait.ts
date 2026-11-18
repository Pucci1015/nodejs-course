// 練習問題8: テストの中の「決まった時間だけ待つ」を見つける ESLint のルールを書く
// 確かめ方（exercises で）: node --test no-fixed-wait.test.ts
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
    // ここを書く
    void context;
    return {};
  },
};

export default rule;
