// 練習問題5で使う、読書メモのデータ（buggy-views.mjs と模範解答が同じものを使う）
export const notes = [
  { id: 1, title: 'Tom & Jerry の作り方', memo: 'R&D の話', tags: ['アニメ', '制作'], source: 'https://example.com/tom' },
  { id: 2, title: 'HTML の <p> と <div>', memo: null, tags: [], source: null },
  { id: 3, title: '"引用" の書き方', memo: '</textarea> というタグの説明', tags: ['HTML'], source: 'mailto:author@example.com' },
  { id: 4, title: '</script> の書き方', memo: 'script の終わりを書く話', tags: ['HTML', 'JS'], source: 'ftp://example.com/old' },
  { id: 5, title: 'Node と Flask の違い', memo: '1 < 2 のような比較', tags: ['Node', 'Python'], source: '/notes/1' },
];
for (let id = 6; id <= 23; id++) notes.push({ id, title: `メモ ${id}`, memo: `${id} 番目のメモ`, tags: [], source: null });
