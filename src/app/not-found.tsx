// 存在しない URL を開いたときのページ(Next.js の英語の 404 ページの代わり)
import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "./(auth)/parts";
import styles from "./(auth)/auth.module.css";

export const metadata: Metadata = { title: "ページが見つかりません | シンプルTodo" };

export default function NotFound() {
  return (
    <AuthShell title="ページが見つかりません" lead="URL が正しいか確かめてください">
      {/* ログインしていなければ、/tasks を開くとログイン画面に移る */}
      <Link className={`${styles.primary} ${styles.linkButton}`} href="/tasks">
        タスク一覧へ
      </Link>
    </AuthShell>
  );
}
