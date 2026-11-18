"use client";
// タスク一覧の画面(S-03)。追加と完了の切り替えは「先に画面を変えて、後から保存」(仕様書 第9章の楽観的更新)。
// 保存に失敗したら画面を元に戻してエラーを出す
import { useState, type FormEvent } from "react";
import { logout } from "../(auth)/actions";
import { sortTasks, type TaskDTO, type TaskStatus } from "@/lib/task-types";
import { createTaskSchema } from "@/lib/validation/task";
import styles from "./tasks.module.css";

type Props = {
  user: { name: string; email: string };
  initialTasks: TaskDTO[];
};

const SAVE_ERROR = "保存できませんでした。通信状況を確かめて、もう一度お試しください";

// 保存の通信。keepalive を付けると、押した直後に再読み込みしたり画面を閉じたりしても送信が途中で切れない
function send(url: string, method: "POST" | "PATCH", body: unknown) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

// API がエラー本文 { error } を返したときだけ、その文言を画面に出す
class ApiError extends Error {}

async function readError(res: Response) {
  try {
    const body = (await res.json()) as { error?: string };
    return new ApiError(body.error ?? SAVE_ERROR);
  } catch {
    return new ApiError(SAVE_ERROR);
  }
}

// 通信が切れた等(ブラウザの英語のメッセージ)は、決まった文言にする
function messageOf(error: unknown) {
  return error instanceof ApiError ? error.message : SAVE_ERROR;
}

export function TaskBoard({ user, initialTasks }: Props) {
  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const todo = tasks.filter((t) => t.status === "todo");
  const done = tasks.filter((t) => t.status === "done");
  const displayName = user.name || user.email;

  // --- 追加 ---
  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createTaskSchema.safeParse({ title });
    if (!parsed.success) {
      setTitleError(parsed.error.issues[0]?.message ?? "タイトルを入力してください");
      return;
    }
    setTitleError(null);
    setSaveError(null);

    // 1. 仮の行を先に出す(ID は保存後に本物と入れ替える)
    const tempId = `temp-${crypto.randomUUID()}`;
    const temp: TaskDTO = {
      id: tempId,
      title: parsed.data.title,
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
      if (!res.ok) throw await readError(res);
      const saved = (await res.json()) as TaskDTO;
      setTasks((prev) => sortTasks(prev.map((t) => (t.id === tempId ? saved : t))));
    } catch (error) {
      // 3. 失敗したら仮の行を消し、入力欄に文字を戻す
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      setTitle((current) => current || parsed.data.title);
      setSaveError(messageOf(error));
    }
  }

  // --- 完了 / 未完了の切り替え ---
  async function toggleTask(task: TaskDTO) {
    const next: TaskStatus = task.status === "todo" ? "done" : "todo";
    const before = task;
    setSaveError(null);

    // 1. 先に画面を変える(完了の行は「完了」の側へ移る)
    setTasks((prev) =>
      sortTasks(
        prev.map((t) =>
          t.id === task.id ? { ...t, status: next, completedAt: next === "done" ? new Date().toISOString() : null } : t,
        ),
      ),
    );

    // 2. 保存する
    try {
      const res = await send(`/api/tasks/${task.id}`, "PATCH", { status: next });
      if (!res.ok) throw await readError(res);
      const saved = (await res.json()) as TaskDTO;
      setTasks((prev) => sortTasks(prev.map((t) => (t.id === saved.id ? saved : t))));
    } catch (error) {
      // 3. 失敗したら元に戻す
      setTasks((prev) => sortTasks(prev.map((t) => (t.id === before.id ? before : t))));
      setSaveError(messageOf(error));
    }
  }

  const doneCount = done.length;
  const total = tasks.length;

  return (
    <div className={styles.app}>
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
          {(titleError || saveError) && (
            <p className={styles.formError} id="quick-add-err" role="alert">
              <AlertIcon />
              {titleError ?? saveError}
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
                      <TaskRow key={t.id} task={t} onToggle={toggleTask} />
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
                      <TaskRow key={t.id} task={t} onToggle={toggleTask} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: TaskDTO; onToggle: (task: TaskDTO) => void }) {
  const isDone = task.status === "done";
  const isSaving = task.id.startsWith("temp-");
  const isHigh = task.priority === "high" && !isDone;
  return (
    <li className={`${styles.task} ${isDone ? styles.isDone : ""}`} aria-busy={isSaving || undefined}>
      <button
        type="button"
        className={`${styles.check} ${isDone ? styles.checkDone : ""} ${isHigh ? styles.checkHigh : ""}`}
        aria-label={isDone ? `「${task.title}」を未完了に戻す` : `「${task.title}」を完了にする`}
        aria-pressed={isDone}
        disabled={isSaving}
        onClick={() => onToggle(task)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12l5 5 9-10" />
        </svg>
      </button>
      <div className={styles.taskBody}>
        <div className={styles.taskTitle}>{task.title}</div>
      </div>
      {isHigh && (
        <svg className={styles.flag} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" role="img" aria-label="優先度 高">
          <path d="M4 22V4M4 4h13l-2 4 2 4H4" />
        </svg>
      )}
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

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </svg>
  );
}
