# kana-lib

第14章 練習問題5 で、`package.json` を整えるためのライブラリです（npm に公開はしません）。

```js
import { toKatakana, toHiragana } from 'kana-lib';
import { toRomaji } from 'kana-lib/romaji';

toKatakana('ねこ'); // 'ネコ'
toRomaji('すし'); // 'sushi'
```

| フォルダ・ファイル | 中身 |
| --- | --- |
| `src/` | ライブラリの本体。`src/internal/` は外から使わせたくない部品 |
| `test/` | テスト（`npm test`）。公開するパッケージには入れない |
| `notes/` | 開発用のメモ。公開するパッケージには入れない |
| `.env` | 開発用の設定（の見本）。公開するパッケージには**絶対に**入れない |
