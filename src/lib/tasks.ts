// タスクの読み書き(サーバー専用)。どの関数も userId で絞り込み、他人のタスクには触れない
import { getPrisma } from "@/lib/prisma";
import type { Prisma, Task } from "@/generated/prisma/client";
import type { TaskDTO } from "@/lib/task-types";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validation/task";

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

// 自分の全タスク(リスト・ビューの絞り込みはステップ6で足す)
export async function listTasks(userId: string): Promise<TaskDTO[]> {
  const tasks = await getPrisma().task.findMany({ where: { userId }, orderBy: TASK_ORDER });
  return tasks.map(toTaskDTO);
}

// 1件取得。他人のタスク・存在しない ID は null(API では 404 にする)
export async function getTask(userId: string, id: string): Promise<TaskDTO | null> {
  const task = await getPrisma().task.findFirst({ where: { id, userId } });
  return task ? toTaskDTO(task) : null;
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<TaskDTO> {
  const task = await getPrisma().task.create({ data: { userId, title: input.title } });
  return toTaskDTO(task);
}

// 一部更新。送られた項目だけを変える
export async function updateTask(userId: string, id: string, input: UpdateTaskInput): Promise<TaskDTO | null> {
  const data: Prisma.TaskUpdateManyMutationInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  // 期限は日付だけ。UTC の 0時として保存すると、DB の date 型にそのままの日付で入る
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null;
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
