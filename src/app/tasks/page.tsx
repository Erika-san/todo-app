// S-03 タスク一覧(/tasks)
import type { Metadata } from "next";
import { Suspense } from "react";
import { TasksContent } from "./tasks-content";
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
