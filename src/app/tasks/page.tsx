// S-03 タスク一覧(/tasks)。最初の一覧はサーバーで読み、追加・完了の切り替えは画面(TaskBoard)から API を呼ぶ
import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listTasks } from "@/lib/tasks";
import { TaskBoard } from "./task-board";
import styles from "./tasks.module.css";

export const metadata: Metadata = { title: "タスク | シンプルTodo" };

export default function TasksPage() {
  return (
    // ログイン確認とタスクの読み込みはリクエストごとに行うので Suspense の中で動かす(Cache Components の決まり)
    <Suspense fallback={<p className={styles.loading}>読み込み中…</p>}>
      <TasksContent />
    </Suspense>
  );
}

async function TasksContent() {
  // 署名を検証してログイン中のユーザーを確かめ、その人のタスクだけを読む
  const user = await requireUser();
  const tasks = await listTasks(user.id);
  return <TaskBoard user={{ name: user.name, email: user.email }} initialTasks={tasks} />;
}
