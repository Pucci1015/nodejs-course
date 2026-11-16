// 第40章 2〜4・8節: TypeScript・npm のパッケージ・CSS・JSON・画像を import する
import { z } from 'zod'; // node_modules のパッケージを、名前だけで import できる
import './style.css'; // CSS も import できる（Vite が <style> にして入れる）
import logoUrl from './logo.svg'; // 画像は、その URL（文字列）になる
import tasksJson from './tasks.json'; // JSON は、そのままオブジェクトになる
import { greeting } from 'virtual:greeting'; // 8節: プラグインが作るモジュール

const Task = z.object({ id: z.number(), title: z.string() });
type Task = z.infer<typeof Task>;

const tasks: Task[] = z.array(Task).parse(tasksJson);

const title = document.querySelector<HTMLHeadingElement>('#title');
const list = document.querySelector<HTMLUListElement>('#tasks');
const logo = document.querySelector<HTMLImageElement>('#logo');
const env = document.querySelector<HTMLParagraphElement>('#env');
if (!title || !list || !logo || !env) throw new Error('index.html に要素がありません');

title.textContent = `タスク（${tasks.length} 件）`;
list.replaceChildren(
  ...tasks.map((t) => {
    const li = document.createElement('li');
    li.textContent = t.title;
    return li;
  }),
);
logo.src = logoUrl;
// 4節: import.meta.env は、Vite が埋め込む値
env.textContent = `MODE=${import.meta.env.MODE} / VITE_GREETING=${import.meta.env.VITE_GREETING ?? '（なし）'}`;
console.log(greeting);
