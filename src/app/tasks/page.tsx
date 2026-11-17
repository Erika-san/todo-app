// S-03 タスク一覧(仮)。ステップ3ではログイン中の名前とログアウトだけ。本物の一覧はステップ4で作る
import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";
import styles from "./tasks.module.css";

export const metadata: Metadata = { title: "タスク | シンプルTodo" };

export default function TasksPage() {
  return (
    <main className={styles.page}>
      {/* ログイン状態の確認はリクエストごとに行うので、Suspense の中で動かす(Cache Components の決まり) */}
      <Suspense fallback={<p className={styles.loading}>読み込み中…</p>}>
        <CurrentUser />
      </Suspense>
    </main>
  );
}

async function CurrentUser() {
  // 署名を検証してログイン中のユーザーを確かめる。未ログインなら /login へ(proxy の確認に加えた二重の守り)
  const user = await requireUser();
  return (
    <div className={styles.card}>
      <p className={styles.who}>
        ログイン中: <strong>{user.name || user.email}</strong>
      </p>
      <form action={logout}>
        <button className={styles.logout} type="submit">ログアウト</button>
      </form>
    </div>
  );
}
