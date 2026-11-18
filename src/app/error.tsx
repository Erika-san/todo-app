"use client";
// 画面の表示中に思わぬエラーが起きたときのページ(Next.js の英語のエラー画面の代わり)。
// 通信が切れた状態でログアウトなどを押したときもここに来る
import { AuthShell } from "./(auth)/parts";
import styles from "./(auth)/auth.module.css";

export default function ErrorPage() {
  return (
    <AuthShell title="表示できませんでした" lead="通信状況を確かめて、もう一度お試しください">
      <button className={styles.primary} type="button" onClick={() => window.location.reload()}>
        もう一度読み込む
      </button>
    </AuthShell>
  );
}
