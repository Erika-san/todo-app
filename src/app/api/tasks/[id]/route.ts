// GET /api/tasks/:id … 1件取得 / PATCH /api/tasks/:id … 一部更新(このステップでは完了の切り替えだけ)
// 他人のタスク・存在しない ID は、どちらも同じ 404(「その ID が存在すること」自体を教えない)
import { getTask, setTaskStatus } from "@/lib/tasks";
import { isUuid, notFound, parseJson, requireApiUser } from "@/lib/api";
import { updateTaskSchema } from "@/lib/validation/task";

export async function GET(_request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const task = await getTask(auth.user.id, id);
  return task ? Response.json(task) : notFound();
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const input = await parseJson(request, updateTaskSchema);
  if ("response" in input) return input.response;

  const task = await setTaskStatus(auth.user.id, id, input.data.status);
  return task ? Response.json(task) : notFound();
}
