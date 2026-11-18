// /tasks と /tasks/[id] で共通のサーバー側の処理: ログイン確認と、その人のタスクの読み込み
import { requireUser } from "@/lib/auth";
import { listTasks } from "@/lib/tasks";
import { TaskBoard } from "./task-board";

export async function TasksContent() {
  // 署名を検証してログイン中のユーザーを確かめ、その人のタスクだけを読む
  const user = await requireUser();
  const tasks = await listTasks(user.id);
  // どのタスクの詳細を開くかは、画面側が URL(/tasks/[id])から決める
  return <TaskBoard user={{ name: user.name, email: user.email }} initialTasks={tasks} />;
}
