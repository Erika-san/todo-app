// タスクの読み書き(サーバー専用)。どの関数も userId で絞り込み、他人のタスクには触れない
import { getPrisma } from "@/lib/prisma";
import type { Prisma, Task } from "@/generated/prisma/client";
import type { TaskDTO, TaskStatus } from "@/lib/task-types";
import type { CreateTaskInput } from "@/lib/validation/task";

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
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    listId: task.listId,
  };
}

// 自分の全タスク(このステップではリスト・ビューの絞り込みはしない)
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

// 完了 / 未完了の切り替え(仕様書 第8章): 完了にしたら completed_at に現在時刻、戻したら空に
export async function setTaskStatus(userId: string, id: string, status: TaskStatus): Promise<TaskDTO | null> {
  const prisma = getPrisma();
  const { count } = await prisma.task.updateMany({
    where: { id, userId },
    data: { status, completedAt: status === "done" ? new Date() : null },
  });
  if (count === 0) return null;
  return getTask(userId, id);
}
