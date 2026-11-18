// PATCH /api/lists/:id … 名前・色の変更 / DELETE … 削除(中のタスクはインボックスへ)
// 他人のリスト・存在しない ID は、どれも同じ 404
import { deleteList, updateList } from "@/lib/lists";
import { errorResponse, isUuid, listNotFound, parseJson, requireApiUser } from "@/lib/api";
import { DUPLICATE_LIST_NAME, updateListSchema } from "@/lib/validation/list";

export async function PATCH(request: Request, ctx: RouteContext<"/api/lists/[id]">) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) return listNotFound();

  const input = await parseJson(request, updateListSchema);
  if ("response" in input) return input.response;

  const result = await updateList(auth.user.id, id, input.data);
  if ("list" in result) return Response.json(result.list);
  return result.error === "duplicate" ? errorResponse(400, DUPLICATE_LIST_NAME) : listNotFound();
}

// 削除できたら 204(本文なし)
export async function DELETE(_request: Request, ctx: RouteContext<"/api/lists/[id]">) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) return listNotFound();

  const deleted = await deleteList(auth.user.id, id);
  return deleted ? new Response(null, { status: 204 }) : listNotFound();
}
