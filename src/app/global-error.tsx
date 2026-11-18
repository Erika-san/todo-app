"use client";
// 一番外側のレイアウト(layout.tsx)でエラーが起きたときのページ。
// レイアウトの代わりに表示されるので、<html> と <body> から自分で書き、CSS も読み込む
import "./globals.css";
import { AuthShell } from "./(auth)/parts";
import styles from "./(auth)/auth.module.css";

export default function GlobalError() {
  return (
    <html lang="ja" data-theme="blue">
      <body>
        <AuthShell title="表示できませんでした" lead="通信状況を確かめて、もう一度お試しください">
          <button className={styles.primary} type="button" onClick={() => window.location.reload()}>
            もう一度読み込む
          </button>
        </AuthShell>
      </body>
    </html>
  );
}
