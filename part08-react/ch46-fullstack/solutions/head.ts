// 第46章 練習問題2の模範解答
export function escapeHtml(s: string): string {
  // & を最初に変える（後で作った &lt; の & を、もう一度変えないように）
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export type Head = { title: string; description?: string; noindex?: boolean };

export function renderHead({ title, description, noindex = false }: Head): string {
  const parts = [`<title>${escapeHtml(title)}</title>`];
  if (description !== undefined) parts.push(`<meta name="description" content="${escapeHtml(description)}">`);
  if (noindex) parts.push('<meta name="robots" content="noindex">');
  return parts.join('\n');
}
