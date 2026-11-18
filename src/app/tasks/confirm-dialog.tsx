"use client";
// 削除の確認ダイアログ(画面の中に出す。ブラウザの confirm() は使わない)。タスクとリストの削除で使う。
// <dialog> の showModal() を使うと、背景の操作を止め、Esc で閉じ、フォーカスもダイアログの中に留まる
import { useEffect, useId, useRef } from "react";
import styles from "./confirm-dialog.module.css";

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ title, message, confirmLabel = "削除", onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    cancelRef.current?.focus(); // 誤って消さないよう、最初は「キャンセル」にフォーカス
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      onCancel={(e) => {
        e.preventDefault(); // Esc で閉じるときも、状態をそろえるため onCancel を通す
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel(); // 背景(ダイアログの外側)を押したら閉じる
      }}
    >
      <div className={styles.dialogBox}>
        <h2 id={`${id}-title`} className={styles.dialogTitle}>
          {title}
        </h2>
        <p id={`${id}-desc`} className={styles.dialogText}>
          {message}
        </p>
        <div className={styles.dialogActions}>
          <button ref={cancelRef} type="button" className={styles.dialogCancel} onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className={styles.dialogDelete} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
