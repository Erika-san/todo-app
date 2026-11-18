// GET /api/lists … 自分のリスト一覧(各リストの未完了数付き) / POST /api/lists … リストを作成
import { createList, listLists } from "@/lib/lists";
import { errorResponse, parseJson, requireApiUser } from "@/lib/api";
import { createListSchema, DUPLICATE_LIST_NAME } from "@/lib/validation/list";

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  return Response.json(await listLists(auth.user.id));
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const input = await parseJson(request, createListSchema);
  if ("response" in input) return input.response;

  const result = await createList(auth.user.id, input.data);
  if ("error" in result) return errorResponse(400, DUPLICATE_LIST_NAME);
  return Response.json(result.list, { status: 201 });
}
