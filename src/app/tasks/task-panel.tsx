"use client";
// S-04 詳細パネル。PC は右側、スマホ(768px 未満)は全画面。
// タイトルとメモは入力欄から離れたら自動保存、期限・優先度・完了は押したらすぐ保存する(仕様書 第5章)
import { useEffect, useRef, useState } from "react";
import type { TaskDTO, TaskPriority, TaskStatus } from "@/lib/task-types";
import { DESCRIPTION_MAX, taskDescription, taskTitle } from "@/lib/validation/task";
import { addDays, dueWithWeekday, isOverdue, localMonthDay } from "@/lib/dates";
import { AlertIcon, BackIcon, CalendarIcon, CheckIcon, CloseIcon, FlagIcon, MemoIcon, TrashIcon } from "./icons";
import styles from "./task-panel.module.css";

// 詳細パネルから変えられる項目
export type TaskPatch = Partial<{
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
}>;

type Props = {
  task: TaskDTO;
  today: string | null;
  saved: boolean;
  error: string | null;
  onUpdate: (patch: TaskPatch) => Promise<boolean>;
  onDelete: () => void;
  onClose: () => void;
};

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

export function TaskPanel({ task, today, saved, error, onUpdate, onDelete, onClose }: Props) {
  // 入力中の文字(保存するまでは画面の中だけ)。別のタスクを開くとパネルごと作り直される(key)
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState(task.description ?? "");
  const [memoError, setMemoError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const isDone = task.status === "done";
  const overdue = today !== null && isOverdue(task, today);

  function saveTitle() {
    const parsed = taskTitle.safeParse(titleDraft);
    if (!parsed.success) {
      setTitleError(parsed.error.issues[0]?.message ?? "タイトルを入力してください");
      return;
    }
    setTitleError(null);
    setTitleDraft(parsed.data);
    if (parsed.data !== task.title) void onUpdate({ title: parsed.data });
  }

  function saveMemo() {
    const parsed = taskDescription.safeParse(memoDraft);
    if (!parsed.success) {
      setMemoError(parsed.error.issues[0]?.message ?? "1,000文字以内で入力してください");
      return;
    }
    setMemoError(null);
    if (parsed.data !== task.description) void onUpdate({ description: parsed.data });
  }

  function setDue(value: string | null) {
    if (value !== task.dueDate) void onUpdate({ dueDate: value });
  }

  const memoLength = memoDraft.length;
  const status = saved ? (
    <span className={styles.saved} role="status">
      <CheckIcon size={14} />
      保存しました
    </span>
  ) : (
    <span role="status" />
  );

  return (
    <aside className={styles.panel} aria-label="タスク詳細">
      {/* 上部: PC は ×、スマホは「‹ タスク」で閉じる */}
      <div className={styles.head}>
        <button type="button" className={styles.back} onClick={onClose}>
          <BackIcon />
          タスク
        </button>
        <span className={styles.mobileStatus}>{status}</span>
        <button type="button" className={styles.close} aria-label="閉じる" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.titleWrap}>
          <button
            type="button"
            className={`${styles.check} ${isDone ? styles.checkDone : ""} ${task.priority === "high" && !isDone ? styles.checkHigh : ""}`}
            aria-label={isDone ? "未完了に戻す" : "完了にする"}
            aria-pressed={isDone}
            onClick={() => void onUpdate({ status: isDone ? "todo" : "done" })}
          >
            <CheckIcon size={13} strokeWidth={3} />
          </button>
          <div className={styles.titleField}>
            <label className={styles.srOnly} htmlFor="detail-title">タイトル</label>
            <input
              id="detail-title"
              className={`${styles.titleInput} ${isDone ? styles.titleDone : ""}`}
              value={titleDraft}
              autoComplete="off"
              enterKeyHint="done"
              onChange={(e) => {
                setTitleDraft(e.target.value);
                setTitleError(null);
              }}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
              }}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? "detail-title-err" : undefined}
            />
            {titleError && (
              <p className={styles.fieldError} id="detail-title-err" role="alert">
                <AlertIcon />
                {titleError}
              </p>
            )}
          </div>
        </div>

        <dl className={styles.props}>
          {/* 期限 */}
          <dt>
            <CalendarIcon size={18} className={styles.propIcon} />
            期限
          </dt>
          <dd>
            <div className={styles.dueRow}>
              <label className={styles.srOnly} htmlFor="detail-due">期限の日付</label>
              <input
                id="detail-due"
                type="date"
                className={`${styles.dateInput} ${overdue ? styles.dateOverdue : ""}`}
                value={task.dueDate ?? ""}
                onChange={(e) => setDue(e.target.value || null)}
              />
              <div className={styles.seg} role="group" aria-label="期限をすぐ選ぶ">
                <button type="button" disabled={!today} aria-pressed={today !== null && task.dueDate === today} onClick={() => today && setDue(today)}>
                  今日
                </button>
                <button type="button" disabled={!today} aria-pressed={today !== null && task.dueDate === addDays(today, 1)} onClick={() => today && setDue(addDays(today, 1))}>
                  明日
                </button>
                <button type="button" aria-pressed={task.dueDate === null} onClick={() => setDue(null)}>
                  なし
                </button>
              </div>
            </div>
            {task.dueDate && (
              <p className={`${styles.dueText} ${overdue ? styles.dueTextOverdue : ""}`}>
                {dueWithWeekday(task.dueDate)}
                {overdue && "・期限切れ"}
              </p>
            )}
          </dd>

          {/* 優先度 */}
          <dt>
            <FlagIcon size={18} className={styles.propIcon} />
            優先度
          </dt>
          <dd>
            <div className={`${styles.seg} ${styles.prio}`} role="group" aria-label="優先度">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={p.value === "high" ? styles.high : undefined}
                  aria-pressed={task.priority === p.value}
                  onClick={() => task.priority !== p.value && void onUpdate({ priority: p.value })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </dd>
        </dl>

        {/* メモ */}
        <label className={styles.memoLabel} htmlFor="detail-memo">
          <MemoIcon size={16} className={styles.propIcon} />
          メモ
        </label>
        <textarea
          id="detail-memo"
          className={styles.memo}
          rows={6}
          value={memoDraft}
          onChange={(e) => {
            setMemoDraft(e.target.value);
            setMemoError(null);
          }}
          onBlur={saveMemo}
          aria-invalid={memoError ? true : undefined}
          aria-describedby="detail-memo-count"
        />
        <div className={styles.memoFoot}>
          {memoError ? (
            <p className={styles.fieldError} role="alert">
              <AlertIcon />
              {memoError}
            </p>
          ) : (
            <span />
          )}
          <span
            id="detail-memo-count"
            className={`${styles.counter} ${memoLength > DESCRIPTION_MAX ? styles.counterOver : ""}`}
          >
            {memoLength} / {DESCRIPTION_MAX}
          </span>
        </div>

        {error && (
          <p className={styles.saveError} role="alert">
            <AlertIcon />
            {error}
          </p>
        )}
      </div>

      <div className={styles.foot}>
        <span className={styles.footInfo}>
          <span className={styles.pcStatus}>{status}</span>
          {today !== null && <span>{localMonthDay(task.createdAt)} 作成</span>}
        </span>
        <button type="button" className={styles.delete} onClick={() => setConfirming(true)}>
          <TrashIcon />
          削除
        </button>
      </div>

      {confirming && (
        <ConfirmDelete
          title={task.title}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onDelete();
          }}
        />
      )}
    </aside>
  );
}

// 削除の確認ダイアログ(画面の中に出す。ブラウザの confirm() は使わない)。
// <dialog> の showModal() を使うと、背景の操作を止め、Esc で閉じ、フォーカスもダイアログの中に留まる
function ConfirmDelete({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

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
      aria-labelledby="delete-title"
      aria-describedby="delete-desc"
      onCancel={(e) => {
        e.preventDefault(); // Esc で閉じるときも、状態をそろえるため onCancel を通す
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel(); // 背景(ダイアログの外側)を押したら閉じる
      }}
    >
      <div className={styles.dialogBox}>
        <h2 id="delete-title" className={styles.dialogTitle}>タスクを削除</h2>
        <p id="delete-desc" className={styles.dialogText}>
          『{title}』を削除します。元に戻せません。
        </p>
        <div className={styles.dialogActions}>
          <button ref={cancelRef} type="button" className={styles.dialogCancel} onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className={styles.dialogDelete} onClick={onConfirm}>
            削除
          </button>
        </div>
      </div>
    </dialog>
  );
}
