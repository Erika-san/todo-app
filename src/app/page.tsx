import styles from "./page.module.css";

// 動作確認用のトップページ(ステップ3以降で本来の画面に置き換える)
export default function Home() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>シンプルTodo</h1>
    </main>
  );
}
