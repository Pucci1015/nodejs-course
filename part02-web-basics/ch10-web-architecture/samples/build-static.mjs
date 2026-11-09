// SSG（静的サイト生成）版のタスク一覧（第10章 4節）
// 使い方（~/dev/ch10 で）: node samples/build-static.mjs [出力先]   既定: 今いるフォルダの ssg-tasks
//   中身は読まなくてよい（動かして、できたファイルを見る）
//   リクエストが来る「前」に、すべてのページの HTML を作ってファイルに書き出す。
//   書き出したフォルダは、どんな静的ファイルのサーバでも配信できる（サーバでは何も実行しない）。
//   配信の例: node serve.mjs ssg-tasks 8502（serve.mjs は第1部 第4章の samples からコピーしたもの）
import fs from 'node:fs';
import path from 'node:path';
import { listTasks } from './tasks-store.mjs';

const outDir = path.resolve(process.argv[2] ?? 'ssg-tasks');

// 上書きで大事なファイルを消さないように、出力先が既にあれば何もしない
if (fs.existsSync(outDir)) {
  console.error(`${outDir} は既にあります。中身を確認して削除するか、別の出力先を指定してください。`);
  process.exit(1);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function layout(title, body) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} - タスク（SSG）</title>
<style>body { font-family: -apple-system, "Hiragino Sans", sans-serif; margin: 2rem; } .done { text-decoration: line-through; color: #888; }</style>
</head>
<body>
<p><a href="/">タスク（SSG 版）</a></p>
${body}
<p><small>生成した時刻: ${escapeHtml(new Date().toLocaleString('ja-JP'))}</small></p>
</body>
</html>
`;
}

function write(relPath, html) {
  const file = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  console.log(`書き出し: ${path.relative(outDir, file)}（${Buffer.byteLength(html)} バイト）`);
}

const tasks = listTasks();

// 一覧のページ
write(
  'index.html',
  layout(
    '一覧',
    `<h1>タスクの一覧</h1>
<ul>
${tasks.map((t) => `<li><a href="/tasks/${t.id}/" class="${t.done ? 'done' : ''}">${escapeHtml(t.title)}</a></li>`).join('\n')}
</ul>
<p>（SSG では、ここから追加はできません。追加するには、データを変えてもう一度生成します）</p>`,
  ),
);

// タスクごとのページ（/tasks/1/ → tasks/1/index.html）
for (const t of tasks) {
  write(
    path.join('tasks', String(t.id), 'index.html'),
    layout(
      t.title,
      `<h1 class="${t.done ? 'done' : ''}">${escapeHtml(t.title)}</h1>
<p>状態: ${t.done ? '完了' : '未完了'}</p>
<p><a href="/">← 一覧に戻る</a></p>`,
    ),
  );
}

console.log(`\n${tasks.length + 1} ページを ${outDir} に書き出しました。`);
