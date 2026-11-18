"use client";
// タスク一覧の画面(S-03)と詳細パネル(S-04)。
// 追加・編集・完了・削除は「先に画面を変えて、後から保存」(仕様書 第9章の楽観的更新)。失敗したら元に戻してエラーを出す
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { logout } from "../(auth)/actions";
import { sortTasks, type TaskDTO } from "@/lib/task-types";
import { createTaskSchema } from "@/lib/validation/task";
import { dueLabel, isOverdue, todayLocal } from "@/lib/dates";
import { TaskPanel, type TaskPatch } from "./task-panel";
import { AlertIcon, CalendarIcon, FlagIcon, MemoIcon } from "./icons";
import styles from "./tasks.module.css";

type Props = {
  user: { name: string; email: string };
  initialTasks: TaskDTO[];
};

const SAVE_ERROR = "保存できませんでした。通信状況を確かめて、もう一度お試しください";
const DELETE_ERROR = "削除できませんでした。通信状況を確かめて、もう一度お試しください";

// 保存の通信。keepalive を付けると、押した直後に再読み込みしたり画面を閉じたりしても送信が途中で切れない
function send(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  return fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive: true,
  });
}

// API がエラー本文 { error } を返したときだけ、その文言を画面に出す
class ApiError extends Error {}

async function readError(res: Response, fallback: string) {
  try {
    const body = (await res.json()) as { error?: string };
    return new ApiError(body.error ?? fallback);
  } catch {
    return new ApiError(fallback);
  }
}

// 通信が切れた等(ブラウザの英語のメッセージ)は、決まった文言にする
function messageOf(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

// 端末の「今日」。サーバーで描いた画面には出さず(サーバーの時計は UTC のため)、ブラウザで決める。
// 1分ごと・画面に戻ったときに確かめ直すので、日付をまたいでも表示が更新される
function subscribeToday(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  window.addEventListener("focus", onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", onChange);
  };
}
function useToday(): string | null {
  return useSyncExternalStore(subscribeToday, todayLocal, () => null);
}

// URL(/tasks/[id])から、詳細を開いているタスクの ID を読む
const DETAIL_PATH = /^\/tasks\/([0-9a-f-]{36})$/i;

export function TaskBoard({ user, initialTasks }: Props) {
  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<{ taskId: string; message: string } | null>(null);
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  const today = useToday();

  const pathname = usePathname();
  const selectedId = pathname.match(DETAIL_PATH)?.[1] ?? null;
  const selected = selectedId ? (tasks.find((t) => t.id === selectedId) ?? null) : null;
  // 一覧から開いたとき(履歴を1つ積んだとき)だけ、閉じるときに「戻る」を使う
  const openedFromList = useRef(false);

  const todo = tasks.filter((t) => t.status === "todo");
  const done = tasks.filter((t) => t.status === "done");
  const displayName = user.name || user.email;

  // --- 詳細パネルを開く・閉じる(URL だけを変える。ページの読み直しはしない) ---
  function openTask(id: string) {
    if (id === selectedId) return;
    if (selectedId) {
      window.history.replaceState(null, "", `/tasks/${id}`);
    } else {
      window.history.pushState(null, "", `/tasks/${id}`);
      openedFromList.current = true;
    }
  }

  const closePanel = useCallback(() => {
    // 入力中の欄があれば、先にフォーカスを外して自動保存させる
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (openedFromList.current) {
      openedFromList.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", "/tasks");
    }
  }, []);

  // 「戻る」で閉じたとき(popstate)は、次に閉じるとき「戻る」を使わない
  useEffect(() => {
    const onPop = () => {
      if (!DETAIL_PATH.test(window.location.pathname)) openedFromList.current = false;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Esc キーで閉じる(削除の確認ダイアログが開いているときは、ダイアログ側が先に閉じる)
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing) return;
      if (document.querySelector("dialog[open]")) return;
      closePanel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, closePanel]);

  // URL の ID が自分のタスクに無い(消した・他人の ID 等)ときは一覧に戻す
  useEffect(() => {
    if (selectedId && !tasks.some((t) => t.id === selectedId)) {
      openedFromList.current = false;
      window.history.replaceState(null, "", "/tasks");
    }
  }, [selectedId, tasks]);

  // --- 追加 ---
  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createTaskSchema.safeParse({ title });
    if (!parsed.success) {
      setTitleError(parsed.error.issues[0]?.message ?? "タイトルを入力してください");
      return;
    }
    setTitleError(null);
    setListError(null);

    // 1. 仮の行を先に出す(ID は保存後に本物と入れ替える)
    const tempId = `temp-${crypto.randomUUID()}`;
    const temp: TaskDTO = {
      id: tempId,
      title: parsed.data.title,
      description: null,
      status: "todo",
      priority: "medium",
      dueDate: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      listId: null,
    };
    setTasks((prev) => sortTasks([...prev, temp]));
    setTitle("");

    // 2. 保存する
    try {
      const res = await send("/api/tasks", "POST", parsed.data);
      if (!res.ok) throw await readError(res, SAVE_ERROR);
      const saved = (await res.json()) as TaskDTO;
      setTasks((prev) => sortTasks(prev.map((t) => (t.id === tempId ? saved : t))));
    } catch (error) {
      // 3. 失敗したら仮の行を消し、入力欄に文字を戻す
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      setTitle((current) => current || parsed.data.title);
      setListError(messageOf(error, SAVE_ERROR));
    }
  }

  // --- 編集・完了の切り替え(送った項目だけを変える) ---
  async function updateTask(id: string, patch: TaskPatch, from: "list" | "panel"): Promise<boolean> {
    const before = tasks.find((t) => t.id === id);
    if (!before) return false;
    const keys = Object.keys(patch) as (keyof TaskPatch)[];
    if (from === "list") setListError(null);
    else setPanelError(null);

    // 1. 先に画面を変える(完了にした行は「完了」の側へ移る)
    const completedAt =
      patch.status === undefined ? undefined : patch.status === "done" ? new Date().toISOString() : null;
    setTasks((prev) =>
      sortTasks(
        prev.map((t) =>
          t.id === id ? { ...t, ...patch, ...(completedAt !== undefined ? { completedAt } : {}) } : t,
        ),
      ),
    );

    // 2. 保存する
    try {
      const res = await send(`/api/tasks/${id}`, "PATCH", patch);
      if (!res.ok) throw await readError(res, SAVE_ERROR);
      const saved = (await res.json()) as TaskDTO;
      // 送った項目だけをサーバーの値でそろえる(その間に別の項目を変えていても消さない)
      setTasks((prev) =>
        sortTasks(
          prev.map((t) => {
            if (t.id !== id) return t;
            const next = { ...t };
            for (const k of keys) Object.assign(next, { [k]: saved[k] });
            if (patch.status !== undefined) next.completedAt = saved.completedAt;
            return next;
          }),
        ),
      );
      if (from === "panel") setSavedTaskId(id);
      return true;
    } catch (error) {
      // 3. 失敗したら、変えた項目だけを元に戻す
      setTasks((prev) =>
        sortTasks(
          prev.map((t) => {
            if (t.id !== id) return t;
            const next = { ...t };
            for (const k of keys) Object.assign(next, { [k]: before[k] });
            if (patch.status !== undefined) next.completedAt = before.completedAt;
            return next;
          }),
        ),
      );
      const message = messageOf(error, SAVE_ERROR);
      if (from === "list") setListError(message);
      else setPanelError({ taskId: id, message });
      return false;
    }
  }

  // --- 削除(確認ダイアログで OK を押したあとに呼ばれる) ---
  async function deleteTask(task: TaskDTO) {
    setListError(null);
    // 1. 先に一覧から消して、パネルを閉じる
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    closePanel();
    // 2. 削除する
    try {
      const res = await send(`/api/tasks/${task.id}`, "DELETE");
      if (!res.ok) throw await readError(res, DELETE_ERROR);
    } catch (error) {
      // 3. 失敗したら一覧に戻す
      setTasks((prev) => sortTasks([...prev, task]));
      setListError(messageOf(error, DELETE_ERROR));
    }
  }

  const doneCount = done.length;
  const total = tasks.length;

  return (
    <div className={`${styles.app} ${selected ? styles.hasPanel : ""}`}>
      {/* サイドバー(PC)。今日・インボックス・リストはステップ6で作る */}
      <aside className={styles.sidebar} aria-label="アカウント">
        <div className={styles.brandRow}>
          <Logo />
          <span className={styles.brandName}>シンプルTodo</span>
        </div>
        <div className={styles.account}>
          <div className={styles.avatar} aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</div>
          <div className={styles.who}>
            <div className={styles.name}>{displayName}</div>
            {user.name && <div className={styles.mail}>{user.email}</div>}
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className={styles.main}>
        {/* スマホの上部バー(サイドバーの代わり) */}
        <header className={styles.mobileTop}>
          <div className={styles.brandRow}>
            <Logo />
            <span className={styles.brandName}>シンプルTodo</span>
          </div>
          <LogoutButton />
        </header>

        <div className={styles.mainInner}>
          <header className={styles.pageHead}>
            <h1>タスク</h1>
            {total > 0 && (
              <div className={styles.progress}>
                <div
                  className={styles.bar}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={doneCount}
                  aria-label="完了したタスクの割合"
                >
                  <i style={{ width: `${(doneCount / total) * 100}%` }} />
                </div>
                <span className={styles.progressLabel}>
                  {total}件中 {doneCount}件完了
                </span>
              </div>
            )}
          </header>

          {/* 追加欄(PC は上部、スマホは画面下に固定) */}
          <form className={styles.quick} onSubmit={addTask} noValidate>
            <svg className={styles.quickIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <label className={styles.srOnly} htmlFor="quick-add">新しいタスク</label>
            <input
              id="quick-add"
              className={styles.quickInput}
              placeholder="やることを追加"
              autoComplete="off"
              enterKeyHint="done"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(null);
              }}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? "quick-add-err" : undefined}
            />
            <button className={styles.addButton} type="submit" aria-label="追加">
              <span className={styles.addLabel}>追加</span>
              <svg className={styles.addIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </form>
          {(titleError || listError) && (
            <p className={styles.formError} id="quick-add-err" role="alert">
              <AlertIcon />
              {titleError ?? listError}
            </p>
          )}

          {total === 0 ? (
            <p className={styles.empty}>タスクはありません。入力欄から追加しましょう</p>
          ) : (
            <>
              {todo.length > 0 && (
                <section className={styles.section} aria-labelledby="sec-todo">
                  <h2 className={styles.secH} id="sec-todo">
                    未完了<span className={styles.n}>{todo.length}</span>
                  </h2>
                  <ul className={styles.rows}>
                    {todo.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        today={today}
                        selected={t.id === selectedId}
                        onOpen={openTask}
                        onToggle={(task) => updateTask(task.id, { status: "done" }, "list")}
                      />
                    ))}
                  </ul>
                </section>
              )}
              {done.length > 0 && (
                <section className={styles.section} aria-labelledby="sec-done">
                  <h2 className={styles.secH} id="sec-done">
                    完了<span className={styles.n}>{done.length}</span>
                  </h2>
                  <ul className={styles.rows}>
                    {done.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        today={today}
                        selected={t.id === selectedId}
                        onOpen={openTask}
                        onToggle={(task) => updateTask(task.id, { status: "todo" }, "list")}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {selected && (
        <TaskPanel
          key={selected.id}
          task={selected}
          today={today}
          saved={savedTaskId === selected.id}
          error={panelError?.taskId === selected.id ? panelError.message : null}
          onUpdate={(patch) => updateTask(selected.id, patch, "panel")}
          onDelete={() => deleteTask(selected)}
          onClose={closePanel}
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  today,
  selected,
  onOpen,
  onToggle,
}: {
  task: TaskDTO;
  today: string | null;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggle: (task: TaskDTO) => void;
}) {
  const isDone = task.status === "done";
  const isSaving = task.id.startsWith("temp-");
  const isHigh = task.priority === "high";
  const overdue = today !== null && isOverdue(task, today);
  const hasMeta = (task.dueDate && today) || task.description;
  return (
    <li
      className={`${styles.task} ${isDone ? styles.isDone : ""} ${selected ? styles.isSelected : ""}`}
      aria-busy={isSaving || undefined}
    >
      <button
        type="button"
        className={`${styles.check} ${isDone ? styles.checkDone : ""} ${isHigh && !isDone ? styles.checkHigh : ""}`}
        aria-label={isDone ? `「${task.title}」を未完了に戻す` : `「${task.title}」を完了にする`}
        aria-pressed={isDone}
        disabled={isSaving}
        onClick={() => onToggle(task)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12l5 5 9-10" />
        </svg>
      </button>
      {/* 行の本文を押すと詳細パネルが開く */}
      <button
        type="button"
        className={styles.rowMain}
        disabled={isSaving}
        aria-current={selected ? "true" : undefined}
        onClick={() => onOpen(task.id)}
      >
        <span className={`${styles.taskTitle} ${isHigh && !isDone ? styles.isStrong : ""}`}>{task.title}</span>
        {hasMeta && (
          <span className={styles.meta}>
            {task.dueDate && today && (
              <span className={overdue ? styles.overdue : undefined}>
                <CalendarIcon />
                {dueLabel(task.dueDate, today)}
                {overdue && <span className={styles.srOnly}>(期限切れ)</span>}
              </span>
            )}
            {task.description && (
              <span>
                <MemoIcon />
                メモあり
              </span>
            )}
          </span>
        )}
      </button>
      {isHigh && <FlagIcon className={styles.flag} label="優先度 高" />}
    </li>
  );
}

function LogoutButton() {
  return (
    <form action={logout}>
      <button className={styles.logout} type="submit">ログアウト</button>
    </form>
  );
}

function Logo() {
  return (
    <div className={styles.logoSm}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12l5 5 9-10" />
      </svg>
    </div>
  );
}
