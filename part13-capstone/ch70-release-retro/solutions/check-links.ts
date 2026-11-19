// 第70章 練習問題7 の模範解答: README と docs の、切れたリンクを探すコマンド（本文 7.2節）
// 使い方: node check-links.ts <フォルダ>     例: node check-links.ts ~/dev/room-booking
// 終了コード: 0 切れたリンクが無い / 1 切れたリンクがある / 2 使い方の間違い・フォルダが無い
import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export interface Broken {
  file: string; // フォルダから見た .md のパス（区切りは /。例 'docs/README.md'）
  line: number; // 行の番号（1 から）
  target: string; // リンクに書いてあった行き先（そのまま）
}

// [文字](行き先) の行き先。![…](…) も、頭の ! を除けば同じ形
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;
// 調べない行き先（外のサイト・メール・同じページの中）
const SKIP = /^(https?:|mailto:|#)/;

/** 見ないフォルダの中か（node_modules と、. で始まるフォルダ） */
const ignored = (rel: string) =>
  rel
    .split(path.sep)
    .slice(0, -1)
    .some((d) => d === 'node_modules' || d.startsWith('.'));

/** ファイルかフォルダが有るか */
const exists = (p: string) =>
  access(p).then(
    () => true,
    () => false,
  );

/** 1つの .md の、切れたリンク */
async function brokenIn(root: string, rel: string): Promise<Broken[]> {
  const text = await readFile(path.join(root, rel), 'utf8');
  const out: Broken[] = [];
  let inCode = false;
  for (const [i, line] of text.split('\n').entries()) {
    // 追加: ``` の行で、コードのブロックに入る・出る
    if (line.trimStart().startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    // 追加: `…` の中を消してから探す
    for (const m of line.replaceAll(/`[^`]*`/g, '').matchAll(LINK)) {
      const target = m[1] ?? '';
      if (SKIP.test(target)) continue;
      // 追加: # から後ろを取り、%XX を元の文字に戻す。読めない書き方なら、そのまま探す
      const bare = target.split('#')[0] ?? '';
      let decoded = bare;
      try {
        decoded = decodeURIComponent(bare);
      } catch {
        // そのまま
      }
      if (!(await exists(path.resolve(root, path.dirname(rel), decoded))))
        out.push({ file: rel.split(path.sep).join('/'), line: i + 1, target });
    }
  }
  return out;
}

/**
 * フォルダの中の .md を全部読み、行き先のファイルやフォルダが無いリンクを返す
 * - 下のフォルダもたどる。ただし node_modules と、. で始まるフォルダ（.git など）の中は見ない
 * - リンクは [文字](行き先) と ![文字](行き先)。行き先が http:・https:・mailto:・# で始まるものは調べない
 * - 行き先の # から後ろは取り、%E3%81… のような書き方は元の文字に戻してから、.md のあるフォルダから探す
 * - ``` で囲んだコードのブロックの中と、`…` のコードの中は、リンクとみなさない
 * - file の順、同じファイルの中は line の順
 */
export async function findBrokenLinks(root: string): Promise<Broken[]> {
  // 追加: recursive: true で、下のフォルダのものも root から見たパスで返る
  const names = await readdir(root, { recursive: true });
  const mds = names.filter((n) => n.endsWith('.md') && !ignored(n)).toSorted();
  const out: Broken[] = [];
  for (const rel of mds) out.push(...(await brokenIn(root, rel)));
  return out;
}

/**
 * コマンドの本体。終了コードを返す
 * - 引数がフォルダ1つでなければ、使い方を console.error に出して 2（フォルダが無いときも 2）
 * - 切れたリンクを 'docs/README.md:12: adr/0002.md が見つかりません' の形で1行ずつ console.log に出す
 * - 最後の行は、無ければ '切れたリンクはありません'（0）、あれば 'N 個のリンクが切れています'（1）
 */
export async function main(argv: string[]): Promise<number> {
  const [root, ...rest] = argv;
  if (root === undefined || rest.length > 0) {
    console.error('使い方: node check-links.ts <フォルダ>');
    return 2;
  }
  const isDir = await stat(root).then(
    (s) => s.isDirectory(),
    () => false,
  );
  if (!isDir) {
    console.error(`フォルダがありません: ${root}`);
    return 2;
  }
  const broken = await findBrokenLinks(root);
  for (const b of broken) console.log(`${b.file}:${b.line}: ${b.target} が見つかりません`);
  console.log(broken.length === 0 ? '切れたリンクはありません' : `${broken.length} 個のリンクが切れています`);
  return broken.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
