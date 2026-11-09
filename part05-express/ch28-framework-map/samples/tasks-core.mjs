// どのフレームワークからも使う、タスクの決まりとデータ（第28章 2節）
// HTTP を知らないので、Express・Fastify・Hono・Web 標準のハンドラのどれからでも、そのまま呼べる（第26章 3節）
export class NotFoundError extends Error {
  name = 'NotFoundError';
}
export class ValidationError extends Error {
  name = 'ValidationError';
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

export function createTaskService() {
  const tasks = new Map();
  let nextId = 1;
  return {
    list: () => [...tasks.values()],
    get(id) {
      const t = tasks.get(id);
      if (!t) throw new NotFoundError(`タスク ${id} はありません`);
      return t;
    },
    create(body) {
      if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('JSON のオブジェクトを送ってください');
      const extra = Object.keys(body).filter((k) => k !== 'title');
      if (extra.length > 0) throw new ValidationError(`${extra[0]} という項目は使えません`, extra[0]);
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (title.length < 1 || title.length > 100) throw new ValidationError('title は 1〜100 文字です', 'title');
      const task = { id: nextId++, title, done: false };
      tasks.set(task.id, task);
      return task;
    },
    // 練習問題3で使う
    update(id, body) {
      const task = this.get(id);
      if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('JSON のオブジェクトを送ってください');
      const extra = Object.keys(body).filter((k) => k !== 'title' && k !== 'done');
      if (extra.length > 0) throw new ValidationError(`${extra[0]} という項目は使えません`, extra[0]);
      if (Object.keys(body).length === 0) throw new ValidationError('変える項目がありません');
      if ('done' in body && typeof body.done !== 'boolean') throw new ValidationError('done は true か false です', 'done');
      const next = { ...task };
      if ('title' in body) {
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (title.length < 1 || title.length > 100) throw new ValidationError('title は 1〜100 文字です', 'title');
        next.title = title;
      }
      if ('done' in body) next.done = body.done;
      tasks.set(id, next);
      return next;
    },
    remove(id) {
      this.get(id);
      tasks.delete(id);
    },
  };
}

const TITLES = { 400: 'Bad Request', 404: 'Not Found', 415: 'Unsupported Media Type', 422: 'Unprocessable Content', 500: 'Internal Server Error' };

/** problem+json の本文（第25章 4節の形） */
export function problem(status, { detail, instance } = {}) {
  return { type: 'about:blank', title: TITLES[status] ?? 'Error', status, ...(detail && { detail }), ...(instance && { instance }) };
}

/** Content-Type が JSON か */
export const isJson = (contentType) => /^application\/json\s*(;|$)/i.test(contentType ?? '');

/** パスの id を数にする。形が違えば null */
export const parseId = (s) => (/^[1-9][0-9]{0,8}$/.test(s) ? Number(s) : null);
