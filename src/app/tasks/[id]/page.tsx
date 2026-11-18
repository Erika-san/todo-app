// S-04 タスク詳細(/tasks/[id])。一覧の上に詳細パネルを開いた状態で表示する。
// 一覧から行を押したときは画面側が URL だけを変えるので、このページはこの URL を直接開いた・再読み込みしたときに使われる
import type { Metadata } from "next";
import { Suspense } from "react";
import { TasksContent } from "../tasks-content";
import styles from "../tasks.module.css";

export const metadata: Metadata = { title: "タスク | シンプルTodo" };

export default function TaskDetailPage() {
  return (
    <Suspense fallback={<p className={styles.loading}>読み込み中…</p>}>
      <TasksContent />
    </Suspense>
  );
}
