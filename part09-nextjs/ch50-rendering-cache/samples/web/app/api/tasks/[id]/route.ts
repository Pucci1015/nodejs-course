// 第49章 2.4節: /api/tasks/1 のような URL の入り口。[id] の値は、2つ目の引数の params（Promise）に入る
import { getTask } from '../../../../lib/api.ts';

export async function GET(_request: Request, { params }: RouteContext<'/api/tasks/[id]'>) {
  const { id } = await params;
  const task = /^[1-9][0-9]*$/.test(id) ? await getTask(Number(id)) : null;
  if (task === null) {
    return Response.json({ title: 'タスクが見つかりません' }, { status: 404, headers: { 'Content-Type': 'application/problem+json' } });
  }
  return Response.json(task);
}
