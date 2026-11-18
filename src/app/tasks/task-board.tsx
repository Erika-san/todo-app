"use client";
// タスク一覧の画面(S-03)と詳細パネル(S-04)。
// 追加・編集・完了・削除は「先に画面を変えて、後から保存」(仕様書 第9章の楽観的更新)。失敗したら元に戻してエラーを出す。
// どのビュー(今日 / インボックス / 各リスト)と絞り込みタブを開いているかは URL の ? 以降に持つ(src/lib/views.ts)。
// タスクは全部を一度に読み込み、ビューの切り替えは画面の中で絞る(ページを読み直さないので速い)
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { sortTasks, type TaskDTO } from "@/lib/task-types";
import type { ListDTO } from "@/lib/list-types";
import { createTaskSchema } from "@/lib/validation/task";
import { dueLabel, isOverdue, todayLocal } from "@/lib/dates";
import {
  parseStatus,
  parseView,
  sectionsFor,
  sidebarCounts,
  tasksInView,
  viewSearch,
  type StatusFilter,
  type View,
} from "@/lib/views";
import { TaskPanel, type TaskPatch } from "./task-panel";
import { Sidebar } from "./sidebar";
import { AlertIcon, CalendarIcon, ChevronDownIcon, FlagIcon, MemoIcon, MenuIcon, PlusIcon } from "./icons";
import styles from "./tasks.module.css";

type Props = {
  user: { name: string; email: string };
  initialTasks: TaskDTO[];
  initialLists: ListDTO[];
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

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 「今日」ビューの見出しの日付: 11月19日(木)
function headingDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${m}月${d}日(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

const colorStyle = (color: string) => ({ "--c": color }) as CSSProperties;

const TABS: [StatusFilter, string][] = [
  ["all", "すべて"],
  ["todo", "未完了"],
  ["done", "完了"],
];

export function TaskBoard({ user, initialTasks, initialLists }: Props) {
  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);
  const [lists, setLists] = useState<ListDTO[]>(initialLists);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<{ taskId: string; message: string } | null>(null);
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  const [doneCollapsed, setDoneCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const today = useToday();

  // --- URL から、開いているビュー・タブ・タスクを読む ---
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedView = parseView(searchParams);
  // 消したリスト・他人のリストの ID が URL にあるときは「今日」を出す(下の effect で URL も直す)
  const listMissing = requestedView.kind === "list" && !lists.some((l) => l.id === requestedView.listId);
  const view: View = listMissing ? { kind: "today" } : requestedView;
  const status = parseStatus(searchParams);
  const currentList = view.kind === "list" ? lists.find((l) => l.id === view.listId) : undefined;
  const viewName = view.kind === "today" ? "今日" : view.kind === "inbox" ? "インボックス" : (currentList?.name ?? "");

  const selectedId = pathname.match(DETAIL_PATH)?.[1] ?? null;
  const selected = selectedId ? (tasks.find((t) => t.id === selectedId) ?? null) : null;
  // 一覧から開いたとき(履歴を1つ積んだとき)だけ、閉じるときに「戻る」を使う
  const openedFromList = useRef(false);

  // --- このビューに出すタスク・件数 ---
  const inView = tasksInView(tasks, view, today);
  const tabCounts: Record<StatusFilter, number> = {
    all: inView.length,
    todo: inView.filter((t) => t.status === "todo").length,
    done: inView.filter((t) => t.status === "done").length,
  };
  const sections = sectionsFor(inView, view, status, today);
  const counts = sidebarCounts(tasks, today);
  const waitingForToday = view.kind === "today" && today === null;

  // --- ビューの切り替え(URL だけを変える。ページの読み直しはしない) ---
  const navigate = useCallback((next: View) => {
    openedFromList.current = false;
    window.history.pushState(null, "", `/tasks${viewSearch(next)}`);
    setDrawerOpen(false);
  }, []);

  function setStatus(next: StatusFilter) {
    // タブの切り替えは履歴に積まない(「戻る」で前のビューに戻れるように)
    window.history.replaceState(null, "", `${window.location.pathname}${viewSearch(view, next)}`);
  }

  useEffect(() => {
    if (!listMissing) return;
    // 今の URL で確かめ直す(リストを消したときは、すでにインボックスの URL に変えてあるので、そのままにする)
    const current = parseView(new URLSearchParams(window.location.search));
    if (current.kind === "list" && !lists.some((l) => l.id === current.listId)) {
      window.history.replaceState(null, "", `${window.location.pathname}${viewSearch({ kind: "today" })}`);
    }
  }, [listMissing, lists]);

  // --- 詳細パネルを開く・閉じる ---
  function openTask(id: string) {
    if (id === selectedId) return;
    const url = `/tasks/${id}${window.location.search}`;
    if (selectedId) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
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
      window.history.replaceState(null, "", `/tasks${window.location.search}`);
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

  // Esc キーで閉じる(確認ダイアログ・スマホのメニュー・リストのメニューが開いているときは、そちらが先に閉じる)
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing || e.defaultPrevented) return;
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
      window.history.replaceState(null, "", `/tasks${window.location.search}`);
    }
  }, [selectedId, tasks]);

  // --- 追加(今開いているビューに合わせる: リストならそのリスト、「今日」なら期限を今日に) ---
  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const listId = view.kind === "list" ? view.listId : null;
    const dueDate = view.kind === "today" ? todayLocal() : null;
    const parsed = createTaskSchema.safeParse({ title, listId, dueDate });
    if (!parsed.success) {
      setTitleError(parsed.error.issues[0]?.message ?? "タイトルを入力してください");
      return;
    }
    setTitleError(null);
    setListError(null);
    // 「完了」タブを開いていたら、追加した行が見えるように「すべて」に戻す
    if (status === "done") setStatus("all");

    // 1. 仮の行を先に出す(ID は保存後に本物と入れ替える)
    const tempId = `temp-${crypto.randomUUID()}`;
    const temp: TaskDTO = {
      id: tempId,
      title: parsed.data.title,
      description: null,
      status: "todo",
      priority: "medium",
      dueDate,
      completedAt: null,
      createdAt: new Date().toISOString(),
      listId,
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

  // --- 編集・完了の切り替え・リストの移動(送った項目だけを変える) ---
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

  // --- タスクの削除(確認ダイアログで OK を押したあとに呼ばれる) ---
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

  // --- リストの作成。ID が決まってから開くので、保存を待ってから一覧に足す ---
  async function createList(name: string): Promise<string | null> {
    try {
      const res = await send("/api/lists", "POST", { name });
      if (!res.ok) throw await readError(res, SAVE_ERROR);
      const saved = (await res.json()) as ListDTO;
      setLists((prev) => [...prev, saved]);
      navigate({ kind: "list", listId: saved.id });
      return null;
    } catch (error) {
      return messageOf(error, SAVE_ERROR);
    }
  }

  // --- リストの名前・色の変更(先に画面を変える)。失敗したらエラー文言を返す ---
  async function updateList(id: string, patch: { name?: string; color?: string }): Promise<string | null> {
    const before = lists.find((l) => l.id === id);
    if (!before) return null;
    setListError(null);
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    try {
      const res = await send(`/api/lists/${id}`, "PATCH", patch);
      if (!res.ok) throw await readError(res, SAVE_ERROR);
      return null;
    } catch (error) {
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: before.name, color: before.color } : l)));
      const message = messageOf(error, SAVE_ERROR);
      if (patch.name === undefined) setListError(message); // 色の失敗は一覧の上に出す(名前は入力欄の下に出る)
      return message;
    }
  }

  // --- リストの削除。中のタスクはインボックスへ移る(仕様書 第8章 ルール3) ---
  async function deleteList(list: ListDTO) {
    setListError(null);
    const index = lists.findIndex((l) => l.id === list.id);
    const movedIds = tasks.filter((t) => t.listId === list.id).map((t) => t.id);
    // 1. 先に画面から消し、中のタスクをインボックスへ。そのリストを開いていたらインボックスを開く
    setLists((prev) => prev.filter((l) => l.id !== list.id));
    setTasks((prev) => prev.map((t) => (t.listId === list.id ? { ...t, listId: null } : t)));
    if (view.kind === "list" && view.listId === list.id) {
      window.history.replaceState(null, "", `/tasks${viewSearch({ kind: "inbox" })}`);
    }
    // 2. 削除する
    try {
      const res = await send(`/api/lists/${list.id}`, "DELETE");
      if (!res.ok) throw await readError(res, DELETE_ERROR);
    } catch (error) {
      // 3. 失敗したら、リストと中のタスクを元に戻す
      setLists((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, list);
        return next;
      });
      setTasks((prev) => prev.map((t) => (movedIds.includes(t.id) ? { ...t, listId: list.id } : t)));
      setListError(messageOf(error, DELETE_ERROR));
    }
  }

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const sidebarProps = {
    user,
    lists,
    counts,
    view,
    taskCountInList: (listId: string) => tasks.filter((t) => t.listId === listId).length,
    onNavigate: navigate,
    onCreateList: createList,
    onUpdateList: updateList,
    onDeleteList: deleteList,
  };

  const displayName = user.name || user.email;
  const placeholder =
    view.kind === "today" ? "今日やることを追加" : view.kind === "inbox" ? "インボックスに追加" : `「${viewName}」に追加`;

  return (
    <div className={`${styles.app} ${selected ? styles.hasPanel : ""}`}>
      {/* サイドバー(PC) */}
      <aside className={styles.sidebar}>
        <Sidebar variant="sidebar" {...sidebarProps} />
      </aside>

      {/* スマホのメニュー(☰ で開く) */}
      <Drawer open={drawerOpen} onClose={closeDrawer}>
        <Sidebar variant="drawer" {...sidebarProps} onClose={closeDrawer} />
      </Drawer>

      <main className={styles.main}>
        {/* スマホの上部バー(サイドバーの代わり) */}
        <header className={styles.mobileTop}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="メニューを開く"
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </button>
          <div className={styles.avatar} aria-hidden="true">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        </header>

        <div className={styles.mainInner}>
          <header className={styles.pageHead}>
            <div className={styles.titleRow}>
              <h1>{viewName}</h1>
              {view.kind === "today" && today && <span className={styles.date}>{headingDate(today)}</span>}
            </div>
            {tabCounts.all > 0 && (
              <div className={styles.progress}>
                <div
                  className={styles.bar}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={tabCounts.all}
                  aria-valuenow={tabCounts.done}
                  aria-label={view.kind === "today" ? "今日の進み具合" : "完了したタスクの割合"}
                >
                  <i style={{ width: `${(tabCounts.done / tabCounts.all) * 100}%` }} />
                </div>
                <span className={styles.progressLabel}>
                  {tabCounts.all}件中 {tabCounts.done}件完了
                </span>
              </div>
            )}
          </header>

          {/* 追加欄(PC は上部、スマホは画面下に固定) */}
          <form className={styles.quick} onSubmit={addTask} noValidate>
            <PlusIcon className={styles.quickIcon} />
            <label className={styles.srOnly} htmlFor="quick-add">
              新しいタスク
            </label>
            <input
              id="quick-add"
              className={styles.quickInput}
              placeholder={placeholder}
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
              <PlusIcon size={20} className={styles.addIcon} />
            </button>
          </form>
          {(titleError || listError) && (
            <p className={styles.formError} id="quick-add-err" role="alert">
              <AlertIcon />
              {titleError ?? listError}
            </p>
          )}

          {/* 絞り込み(すべて / 未完了 / 完了)と件数 */}
          <div className={styles.tabs} role="group" aria-label="絞り込み">
            {TABS.map(([key, label]) => (
              <button key={key} type="button" aria-pressed={status === key} onClick={() => setStatus(key)}>
                {label}
                {!waitingForToday && <span className={styles.tabCount}>{tabCounts[key]}</span>}
              </button>
            ))}
          </div>

          {waitingForToday ? null : sections.length === 0 ? (
            <p className={styles.empty}>タスクはありません。入力欄から追加しましょう</p>
          ) : (
            sections.map((section) => {
              // 「すべて」タブの「完了」は畳める
              const collapsible = section.done && status === "all";
              const collapsed = collapsible && doneCollapsed;
              return (
                <section key={section.key} className={styles.section} aria-labelledby={`sec-${section.key}`}>
                  {collapsible ? (
                    <h2 className={styles.secH} id={`sec-${section.key}`}>
                      <button
                        type="button"
                        className={`${styles.toggle} ${collapsed ? styles.toggleClosed : ""}`}
                        aria-expanded={!collapsed}
                        aria-controls={`rows-${section.key}`}
                        onClick={() => setDoneCollapsed((v) => !v)}
                      >
                        <ChevronDownIcon className={styles.toggleIcon} />
                        {section.label}
                        <span className={styles.n}>{section.tasks.length}</span>
                      </button>
                    </h2>
                  ) : (
                    <h2 className={`${styles.secH} ${section.danger ? styles.secDanger : ""}`} id={`sec-${section.key}`}>
                      {section.label}
                      <span className={styles.n}>{section.tasks.length}</span>
                    </h2>
                  )}
                  <ul className={styles.rows} id={`rows-${section.key}`} hidden={collapsed}>
                    {section.tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        today={today}
                        showList={view.kind === "today"}
                        list={t.listId ? lists.find((l) => l.id === t.listId) : undefined}
                        selected={t.id === selectedId}
                        onOpen={openTask}
                        onToggle={(task) =>
                          updateTask(task.id, { status: task.status === "done" ? "todo" : "done" }, "list")
                        }
                      />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </main>

      {selected && (
        <TaskPanel
          key={selected.id}
          task={selected}
          lists={lists}
          backLabel={viewName}
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

// スマホのメニュー(sp-menu.html)。<dialog> の showModal() で開くので、背景は操作できず、Esc でも閉じる
function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // 画面を広げて PC の表示になったら閉じる
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) onClose();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open, onClose]);

  return (
    <dialog
      ref={ref}
      className={styles.drawer}
      aria-label="メニュー"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // メニューの外(暗い所)を押したら閉じる
      }}
    >
      {open && children}
    </dialog>
  );
}

function TaskRow({
  task,
  today,
  showList,
  list,
  selected,
  onOpen,
  onToggle,
}: {
  task: TaskDTO;
  today: string | null;
  showList: boolean; // 「今日」ビューでは、行にリスト名を出す(仕様書 第5章)
  list: ListDTO | undefined;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggle: (task: TaskDTO) => void;
}) {
  const isDone = task.status === "done";
  const isSaving = task.id.startsWith("temp-");
  const isHigh = task.priority === "high";
  const overdue = today !== null && isOverdue(task, today);
  // 「今日」ビューの「今日」の行には、期限の「今日」は出さない(見出しでわかるため)
  const showDue = task.dueDate !== null && today !== null && !(showList && task.dueDate === today);
  const hasMeta = showDue || showList || task.description;
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
            {showDue && task.dueDate && today && (
              <span className={overdue ? styles.overdue : undefined}>
                <CalendarIcon />
                {dueLabel(task.dueDate, today)}
                {overdue && <span className={styles.srOnly}>(期限切れ)</span>}
              </span>
            )}
            {showList && (
              <span>
                {list && <i className={styles.swatch} style={colorStyle(list.color)} aria-hidden="true" />}
                {list?.name ?? "インボックス"}
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
