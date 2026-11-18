# 第59章 自作の ESLint のルール（samples/finished/rules）

| ファイル                                             | 中身                                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [no-focused-tests.ts](no-focused-tests.ts)           | `test.only`・`describe.only`・`it.only`・`suite.only` を見つけるルール（本文4節）                  |
| [no-focused-tests.test.ts](no-focused-tests.test.ts) | ESLint の `RuleTester` を node:test で動かすテスト（`node --test rules/no-focused-tests.test.ts`） |
