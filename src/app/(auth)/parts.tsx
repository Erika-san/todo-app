// ログイン・新規登録で共通の部品(ロゴ・見出し・エラー表示)
import type { ReactNode } from "react";
import styles from "./auth.module.css";

export function AuthShell({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <main className={styles.auth}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
          </div>
          <h1>{title}</h1>
          <p>{lead}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

export function ErrorMessage({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className={`${styles.msg} ${styles.error}`} id={id} role="alert">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5M12 16h.01" />
      </svg>
      {children}
    </p>
  );
}
