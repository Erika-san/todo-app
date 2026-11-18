// 画面と API でやりとりするタスクの形と、並び順の決まり(ブラウザでもサーバーでも使う)

export type TaskStatus = "todo" | "done";
export type TaskPriority = "high" | "medium" | "low";

// API が返すタスク(仕様書 第7章の例に合わせる)
export type TaskDTO = {
  id: string;
  title: string;
  description: string | null; // メモ
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null; // "2026-11-20" の形(時刻なし)
  completedAt: string | null; // ISO 形式の日時
  createdAt: string;
  listId: string | null;
};

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

// 初期の並び順(仕様書 第2章): 未完了が上 → 期限が近い順(期限なしは後ろ) → 優先度が高い順。
// それでも同じなら古い順(新しく追加したタスクは同じ条件の中で一番下に入る)。
// DB の並べ替え(src/lib/tasks.ts の TASK_ORDER)と同じ規則にしておくこと
export function compareTasks(a: TaskDTO, b: TaskDTO): number {
  if (a.status !== b.status) return a.status === "todo" ? -1 : 1;
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortTasks(tasks: TaskDTO[]): TaskDTO[] {
  return [...tasks].sort(compareTasks);
}
