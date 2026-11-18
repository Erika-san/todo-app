// タスク一覧のビュー(今日 / インボックス / 各リスト)と絞り込み(すべて / 未完了 / 完了)。ブラウザで使う。
// どのビューを開いているかは URL に持たせる(再読み込みや「戻る」でも同じビューに戻れるように)
//   /tasks?view=today(/tasks だけのときも「今日」) … 今日
//   /tasks?view=inbox … インボックス
//   /tasks?list=<リストの ID> … そのリスト
//   上のどれにも &status=todo / &status=done を付けると「未完了」「完了」タブ(付けなければ「すべて」)
import type { TaskDTO } from "@/lib/task-types";
import { isOverdue } from "@/lib/dates";

export type View = { kind: "today" } | { kind: "inbox" } | { kind: "list"; listId: string };
export type StatusFilter = "all" | "todo" | "done";

export function parseView(params: URLSearchParams): View {
  const listId = params.get("list");
  if (listId) return { kind: "list", listId };
  if (params.get("view") === "inbox") return { kind: "inbox" };
  return { kind: "today" };
}

export function parseStatus(params: URLSearchParams): StatusFilter {
  const status = params.get("status");
  return status === "todo" || status === "done" ? status : "all";
}

// ビューと絞り込みから URL の ? 以降を作る
export function viewSearch(view: View, status: StatusFilter = "all"): string {
  const params = new URLSearchParams();
  if (view.kind === "list") params.set("list", view.listId);
  else params.set("view", view.kind);
  if (status !== "all") params.set("status", status);
  return `?${params.toString()}`;
}

export function sameView(a: View, b: View) {
  return a.kind === b.kind && (a.kind !== "list" || (b.kind === "list" && a.listId === b.listId));
}

// 完了した日(端末の日付)
function localDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 「今日」ビューに出す未完了タスク(仕様書 F-12): 期限が今日以前の未完了。全リスト横断
export function isTodayTodo(task: TaskDTO, today: string) {
  return task.status === "todo" && task.dueDate !== null && task.dueDate <= today;
}

// 「今日」ビューの「完了」: 今日(端末の日付で)完了にしたタスク。進み具合「○件中○件完了」に数える
export function isDoneToday(task: TaskDTO, today: string) {
  return task.status === "done" && task.completedAt !== null && localDate(task.completedAt) === today;
}

// そのビューに入るタスク(絞り込みタブをかける前)。「今日」は端末の日付がわかるまで(today = null)空
export function tasksInView(tasks: TaskDTO[], view: View, today: string | null): TaskDTO[] {
  switch (view.kind) {
    case "today":
      if (today === null) return [];
      return tasks.filter((t) => isTodayTodo(t, today) || isDoneToday(t, today));
    case "inbox":
      return tasks.filter((t) => t.listId === null);
    case "list":
      return tasks.filter((t) => t.listId === view.listId);
  }
}

// サイドバーの件数(未完了の数)
export function sidebarCounts(tasks: TaskDTO[], today: string | null) {
  const todo = tasks.filter((t) => t.status === "todo");
  const byList = new Map<string, number>();
  for (const t of todo) if (t.listId) byList.set(t.listId, (byList.get(t.listId) ?? 0) + 1);
  return {
    today: today === null ? null : todo.filter((t) => isTodayTodo(t, today)).length,
    inbox: todo.filter((t) => t.listId === null).length,
    byList,
  };
}

// 一覧の区切り。「今日」ビューは 期限切れ / 今日 / 完了、それ以外は 未完了 / 完了
export type Section = { key: string; label: string; tasks: TaskDTO[]; danger?: boolean; done?: boolean };

export function sectionsFor(tasks: TaskDTO[], view: View, status: StatusFilter, today: string | null): Section[] {
  const todo = status === "done" ? [] : tasks.filter((t) => t.status === "todo");
  const done = status === "todo" ? [] : tasks.filter((t) => t.status === "done");
  const sections: Section[] =
    view.kind === "today" && today !== null
      ? [
          { key: "overdue", label: "期限切れ", tasks: todo.filter((t) => isOverdue(t, today)), danger: true },
          { key: "today", label: "今日", tasks: todo.filter((t) => t.dueDate === today) },
        ]
      : [{ key: "todo", label: "未完了", tasks: todo }];
  sections.push({ key: "done", label: "完了", tasks: done, done: true });
  return sections.filter((s) => s.tasks.length > 0);
}
