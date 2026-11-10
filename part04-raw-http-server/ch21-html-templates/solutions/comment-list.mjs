// 練習問題2 の模範解答
import { html } from '../samples/mini-html.mjs';

export function commentItem(comment) {
  const cls = comment.starred ? 'comment starred' : 'comment';
  return html`<li class="${cls}"><b>${comment.name}</b>: ${comment.text}</li>`;
}

export function commentList(comments) {
  if (comments.length === 0) return html`<p class="empty">コメントはありません</p>`;
  return html`<ul class="comments">${comments.map(commentItem)}</ul>`;
}
