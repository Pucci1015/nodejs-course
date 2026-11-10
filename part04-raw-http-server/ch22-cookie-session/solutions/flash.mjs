// 練習問題2 の模範解答
export function addFlash(session, message) {
  if (!Array.isArray(session.flash)) session.flash = [];
  session.flash.push(message);
}

export function takeFlash(session) {
  const messages = Array.isArray(session.flash) ? session.flash : [];
  delete session.flash;
  return messages;
}
