// 第65章 練習問題6: ファイルの名前に中身のハッシュを入れ、HTML の中の参照を書き換える（本文 5.1節）
import crypto from 'node:crypto';
import path from 'node:path';

export type HashResult = {
  /** 書き換えた HTML */
  html: string;
  /** 新しい名前 → 中身 */
  files: Record<string, string>;
  /** 元の名前 → 新しい名前 */
  manifest: Record<string, string>;
};

/** 本文 5.1節の hashedName を、フォルダつきの名前に使えるようにしたもの */
function hashedName(fileName: string, content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
  const ext = path.posix.extname(fileName);
  const dir = path.posix.dirname(fileName);
  return path.posix.join(dir, `${path.posix.basename(fileName, ext)}.${hash}${ext}`);
}

/**
 * assets は「assets/app.js」のような名前 → 中身。
 * html の中の "/assets/app.js"（" で囲まれたもの）を、"/assets/app.（8 文字）.js" に書き換える
 */
export function hashAssets(html: string, assets: Record<string, string>): HashResult {
  const files: Record<string, string> = {};
  const manifest: Record<string, string> = {};
  let out = html;
  for (const [name, content] of Object.entries(assets)) {
    const hashed = hashedName(name, content);
    files[hashed] = content;
    manifest[name] = hashed;
    // " で囲んで探すので、"/assets/app.js" は書き換え、"/assets/app.jsx" は書き換えない
    out = out.replaceAll(`"/${name}"`, `"/${hashed}"`);
  }
  return { html: out, files, manifest };
}
