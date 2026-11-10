// 練習問題6の模範解答: タスクの決まりを、HTTP からもデータの置き場所からも切り離して書く
import { ConflictError, NotFoundError, ValidationError } from './errors.mjs';

const STATUSES = ['todo', 'doing', 'done'];

/** その時刻が、timeZone で何日か（'YYYY-MM-DD'） */
function dateIn(timeZone, date) {
  // 修正: toISOString().slice(0, 10) は UTC の日付。日本の朝 9 時より前は、前の日になってしまう
  // en-CA の書き方は YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/**
 * @param {{ repo: object, clock: () => Date, maxDoing?: number, timeZone?: string }} deps
 */
export function createTaskService({ repo, clock, maxDoing = 3, timeZone = 'Asia/Tokyo' }) {
  const today = () => dateIn(timeZone, clock());

  function checkTitle(title) {
    const t = typeof title === 'string' ? title.trim() : '';
    if (t.length < 1 || t.length > 100) throw new ValidationError('title は 1〜100 文字です', 'title');
    return t;
  }
  function checkDueDate(dueDate) {
    if (dueDate === null || dueDate === undefined) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new ValidationError('dueDate は YYYY-MM-DD です', 'dueDate');
    if (dueDate < today()) throw new ValidationError('締め切りが過ぎています', 'dueDate');
    return dueDate;
  }
  async function checkUniqueTitle(title, exceptId) {
    const all = await repo.list();
    if (all.some((x) => x.id !== exceptId && x.status !== 'done' && x.title === title)) {
      throw new ConflictError('同じ題名の、終わっていないタスクがあります');
    }
  }
  async function mustGet(id) {
    const task = await repo.get(id);
    if (!task) throw new NotFoundError(`タスク ${id} はありません`);
    return task;
  }

  return {
    async list({ status } = {}) {
      const all = await repo.list();
      const items = status ? all.filter((t) => t.status === status) : all;
      return items.sort((a, b) => a.id - b.id);
    },

    get: mustGet,

    async create({ title, dueDate } = {}) {
      const t = checkTitle(title);
      const d = checkDueDate(dueDate);
      await checkUniqueTitle(t);
      const now = clock().toISOString();
      return repo.insert({ title: t, status: 'todo', dueDate: d, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
    },

    async update(id, changes = {}) {
      const current = await mustGet(id);
      const next = {};
      const has = (k) => Object.hasOwn(changes, k);

      // 追加: 終わったタスクは、status を戻す（やり直す）こと以外は変えられない
      if (current.status === 'done' && (has('title') || has('dueDate')) && !(has('status') && changes.status !== 'done')) {
        throw new ConflictError('完了したタスクは変えられません。先に status を戻してください');
      }
      if (has('title')) {
        const t = checkTitle(changes.title);
        if (t !== current.title) {
          await checkUniqueTitle(t, id);
          next.title = t;
        }
      }
      if (has('dueDate') && changes.dueDate !== current.dueDate) next.dueDate = checkDueDate(changes.dueDate); // 同じ値なら確かめない（昨日の締め切りのまま、題名だけ変えられるように）
      if (has('status') && changes.status !== current.status) {
        if (!STATUSES.includes(changes.status)) throw new ValidationError(`status は ${STATUSES.join('・')} のどれかです`, 'status');
        // 追加: 「作業中」は同時に maxDoing 個まで（WIP 制限）
        if (changes.status === 'doing') {
          const doing = (await repo.list()).filter((t) => t.status === 'doing').length;
          if (doing >= maxDoing) throw new ConflictError(`作業中のタスクは ${maxDoing} 個までです`);
        }
        // やり直したタスクの題名が、別の終わっていないタスクと重なることもある
        if (current.status === 'done') await checkUniqueTitle(next.title ?? current.title, id);
        next.status = changes.status;
        next.completedAt = changes.status === 'done' ? clock().toISOString() : null;
      }
      if (Object.keys(next).length === 0) return current; // 何も変わらないなら、version も上げない
      return repo.update(id, { ...next, updatedAt: clock().toISOString(), version: current.version + 1 });
    },

    async remove(id) {
      await mustGet(id);
      await repo.remove(id);
    },
  };
}
