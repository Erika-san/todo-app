// /tasks と /tasks/[id] で共通のサーバー側の処理: ログイン確認と、その人のタスク・リストの読み込み
import { requireUser } from "@/lib/auth";
import { listAllTasks } from "@/lib/tasks";
import { listLists } from "@/lib/lists";
import { TaskBoard } from "./task-board";

export async function TasksContent() {
  // 署名を検証してログイン中のユーザーを確かめ、その人のタスクとリストだけを読む
  const user = await requireUser();
  const [tasks, lists] = await Promise.all([listAllTasks(user.id), listLists(user.id)]);
  // どのビュー・どのタスクの詳細を開くかは、画面側が URL から決める
  return <TaskBoard user={{ name: user.name, email: user.email }} initialTasks={tasks} initialLists={lists} />;
}
