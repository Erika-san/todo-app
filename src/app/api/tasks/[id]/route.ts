// GET /api/tasks/:id … 1件取得 / PATCH … 一部更新 / DELETE … 削除
// 他人のタスク・存在しない ID は、どれも同じ 404(「その ID が存在すること」自体を教えない)
import { deleteTask, getTask, updateTask } from "@/lib/tasks";
import { isUuid, listNotFound, notFound, parseJson, requireApiUser } from "@/lib/api";
import { updateTaskSchema } from "@/lib/validation/task";

export async function GET(_request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const task = await getTask(auth.user.id, id);
  return task ? Response.json(task) : notFound();
}

// 送った項目(title / description / dueDate / priority / status / listId)だけを変える。
// 移す先のリストが他人のもの・存在しないときは 404「リストが見つかりません」
export async function PATCH(request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const input = await parseJson(request, updateTaskSchema);
  if ("response" in input) return input.response;

  const task = await updateTask(auth.user.id, id, input.data);
  if (task && "error" in task) return listNotFound();
  return task ? Response.json(task) : notFound();
}

// 削除できたら 204(本文なし)
export async function DELETE(_request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const deleted = await deleteTask(auth.user.id, id);
  return deleted ? new Response(null, { status: 204 }) : notFound();
}
