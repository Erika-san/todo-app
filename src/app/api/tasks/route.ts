// GET /api/tasks … 自分のタスク一覧 / POST /api/tasks … タスクを追加
import { createTask, listTasks } from "@/lib/tasks";
import { parseJson, requireApiUser } from "@/lib/api";
import { createTaskSchema } from "@/lib/validation/task";

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const tasks = await listTasks(auth.user.id);
  return Response.json(tasks);
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const input = await parseJson(request, createTaskSchema);
  if ("response" in input) return input.response;

  const task = await createTask(auth.user.id, input.data);
  return Response.json(task, { status: 201 });
}
