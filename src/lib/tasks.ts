// タスクの読み書き(サーバー専用)。どの関数も userId で絞り込み、他人のタスクには触れない
import { getPrisma } from "@/lib/prisma";
import type { Prisma, Task } from "@/generated/prisma/client";
import type { TaskDTO } from "@/lib/task-types";
import { ownsList } from "@/lib/lists";
import type { CreateTaskInput, TaskQuery, UpdateTaskInput } from "@/lib/validation/task";

// リストを指定したのに、そのリストが自分のものでない(他人のリスト・存在しない ID)
export type ListNotFound = { error: "list-not-found" };

// 初期の並び順(仕様書 第2章)。src/lib/task-types.ts の compareTasks と同じ規則
// status は DB の enum の定義順(todo → done)、priority も定義順(high → medium → low)で並ぶ
const TASK_ORDER: Prisma.TaskOrderByWithRelationInput[] = [
  { status: "asc" },
  { dueDate: { sort: "asc", nulls: "last" } },
  { priority: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
];

export function toTaskDTO(task: Task): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    // DB の date 型は UTC の 0時として読まれるので、日付の部分だけを取り出す
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    listId: task.listId,
  };
}

// 期限("YYYY-MM-DD")を DB の date 型の値に。UTC の 0時にすると、そのままの日付で入る
function toDbDate(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

// 自分の全タスク(画面の最初の表示用。ビューの切り替えは画面側で絞る)
export async function listAllTasks(userId: string): Promise<TaskDTO[]> {
  const tasks = await getPrisma().task.findMany({ where: { userId }, orderBy: TASK_ORDER });
  return tasks.map(toTaskDTO);
}

// 自分のタスク(API 用)。絞り込み(リスト・「今日」・未完了/完了)を指定しなければ全部
export async function listTasks(userId: string, query: TaskQuery = {}): Promise<TaskDTO[] | ListNotFound> {
  const where: Prisma.TaskWhereInput = { userId };
  if (query.listId === "inbox") where.listId = null;
  else if (query.listId) {
    if (!(await ownsList(userId, query.listId))) return { error: "list-not-found" };
    where.listId = query.listId;
  }
  if (query.status) where.status = query.status;
  // 「今日」ビュー: 期限が今日以前(期限切れ + 今日)。status を指定しなければ未完了だけ(仕様書 F-12)
  if (query.view === "today" && query.today) {
    where.dueDate = { lte: toDbDate(query.today) };
    where.status = query.status ?? "todo";
  }
  const tasks = await getPrisma().task.findMany({ where, orderBy: TASK_ORDER });
  return tasks.map(toTaskDTO);
}

// 1件取得。他人のタスク・存在しない ID は null(API では 404 にする)
export async function getTask(userId: string, id: string): Promise<TaskDTO | null> {
  const task = await getPrisma().task.findFirst({ where: { id, userId } });
  return task ? toTaskDTO(task) : null;
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<TaskDTO | ListNotFound> {
  if (input.listId && !(await ownsList(userId, input.listId))) return { error: "list-not-found" };
  const task = await getPrisma().task.create({
    data: {
      userId,
      title: input.title,
      listId: input.listId ?? null,
      dueDate: input.dueDate ? toDbDate(input.dueDate) : null,
    },
  });
  return toTaskDTO(task);
}

// 一部更新。送られた項目だけを変える
export async function updateTask(
  userId: string,
  id: string,
  input: UpdateTaskInput,
): Promise<TaskDTO | ListNotFound | null> {
  // 別のリストへ移すときは、移す先が自分のリストか確かめる(他人のリストなら 404)
  if (input.listId && !(await ownsList(userId, input.listId))) return { error: "list-not-found" };
  const data: Prisma.TaskUncheckedUpdateManyInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? toDbDate(input.dueDate) : null;
  if (input.listId !== undefined) data.listId = input.listId;
  // 完了にしたら completed_at に現在時刻、未完了に戻したら空に(仕様書 第8章)
  if (input.status !== undefined) {
    data.status = input.status;
    data.completedAt = input.status === "done" ? new Date() : null;
  }

  const { count } = await getPrisma().task.updateMany({ where: { id, userId }, data });
  if (count === 0) return null;
  return getTask(userId, id);
}

// 削除。消せたら true、他人のタスク・存在しない ID は false(API では 404 にする)
export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const { count } = await getPrisma().task.deleteMany({ where: { id, userId } });
  return count > 0;
}
