# 第56章 サンプルのミュータント

本文9節で使う、[../duration.ts](../duration.ts) をわざと1か所だけ壊したもの（**ミュータント**）です。1行目のコメントに、どこを壊したかが書いてあります。[../../../tools/check-tests.ts](../../../tools/check-tests.ts) が、テストをこれらのファイルで動かし、テストが失敗する（＝間違いを見つけた）かを確かめます。

| ファイル | 壊した所 |
| --- | --- |
| [duration-1.ts](duration-1.ts) | 下限を 0 にした（0 分を通す） |
| [duration-2.ts](duration-2.ts) | 上限を「より小さい」にした（24時間ちょうどを断る） |
| [duration-3.ts](duration-3.ts) | 前後の空白を除かない |
| [duration-4.ts](duration-4.ts) | 1時間を 100 分と数える |
| [duration-5.ts](duration-5.ts) | 小数の時間も読む（1.5h → 90） |

```sh
$ cd ~/dev/part11/ch56-testing-basics
$ node ../tools/check-tests.ts duration.test.ts --mutants samples/mutants   # 自分の duration.ts と duration.test.ts で
```
