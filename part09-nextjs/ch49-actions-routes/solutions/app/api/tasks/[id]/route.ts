// 第49章 練習問題8の模範解答: GET・DELETE /api/tasks/[id]。If-Match を確かめてから、API に頼む
import { ApiError, deleteTask, getTask } from '../../../../lib/api.ts';

const problem = (status: number, title: string, detail?: string) =>
  Response.json({ title, detail }, { status, headers: { 'Content-Type': 'application/problem+json' } });

/** URL の id。正の整数でなければ null */
const toId = (id: string) => (/^[1-9][0-9]*$/.test(id) ? Number(id) : null);

export async function GET(_request: Request, { params }: RouteContext<'/api/tasks/[id]'>) {
  const id = toId((await params).id);
  const task = id === null ? null : await getTask(id);
  if (task === null) return problem(404, 'タスクが見つかりません');
  return Response.json(task);
}

export async function DELETE(request: Request, { params }: RouteContext<'/api/tasks/[id]'>) {
  const id = toId((await params).id);
  if (id === null) return problem(404, 'タスクが見つかりません');
  const ifMatch = request.headers.get('If-Match');
  if (ifMatch === null) return problem(428, 'If-Match に、読んだときの ETag を入れて送ってください');
  const m = /^"([1-9][0-9]*)"$/.exec(ifMatch);
  if (m === null) return problem(400, 'If-Match は "1" のような形です');
  try {
    await deleteTask({ id, version: Number(m[1]) });
  } catch (err) {
    // API の答え（404・412 など）を、そのまま返す
    if (err instanceof ApiError && err.status < 500) return problem(err.status, err.problem.title ?? 'API が断りました', err.problem.detail);
    throw err;
  }
  return new Response(null, { status: 204 });
}
