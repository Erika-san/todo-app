// GET /api/tasks … 自分のタスク一覧(?listId= ?view=today&today= ?status= で絞る) / POST /api/tasks … タスクを追加
import { createTask, listTasks } from "@/lib/tasks";
import { errorResponse, listNotFound, parseJson, requireApiUser } from "@/lib/api";
import { createTaskSchema, taskQuerySchema } from "@/lib/validation/task";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = taskQuerySchema.safeParse(params);
  if (!query.success) return errorResponse(400, query.error.issues[0]?.message ?? "絞り込みの指定が正しくありません");

  const tasks = await listTasks(auth.user.id, query.data);
  return "error" in tasks ? listNotFound() : Response.json(tasks);
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const input = await parseJson(request, createTaskSchema);
  if ("response" in input) return input.response;

  const task = await createTask(auth.user.id, input.data);
  return "error" in task ? listNotFound() : Response.json(task, { status: 201 });
}
