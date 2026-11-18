"use client";
// サイドバー(PC は左に常に表示、スマホは ☰ で開くメニューの中身)。
// 今日・インボックス・リスト一覧(それぞれ未完了数)と、リストの追加・名前変更・色・削除(仕様書 F-10)
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { LIST_COLORS, type ListDTO } from "@/lib/list-types";
import { isDuplicateListName, listName, DUPLICATE_LIST_NAME } from "@/lib/validation/list";
import { sameView, viewSearch, type View } from "@/lib/views";
import { useFormStatus } from "react-dom";
import { logout } from "../(auth)/actions";
import { ConfirmDialog } from "./confirm-dialog";
import { AlertIcon, CheckIcon, CloseIcon, DotsIcon, InboxIcon, PencilIcon, PlusIcon, SunIcon, TrashIcon } from "./icons";
import styles from "./sidebar.module.css";

type Props = {
  variant: "sidebar" | "drawer";
  user: { name: string; email: string };
  lists: ListDTO[];
  counts: { today: number | null; inbox: number; byList: Map<string, number> };
  taskCountInList: (listId: string) => number;
  view: View;
  onNavigate: (view: View) => void;
  onClose?: () => void; // スマホのメニューを閉じる
  onCreateList: (name: string) => Promise<string | null>; // 失敗したらエラー文言を返す
  onUpdateList: (id: string, patch: { name?: string; color?: string }) => Promise<string | null>;
  onDeleteList: (list: ListDTO) => void;
};

// リスト名のチェック(画面側)。だめならエラー文言
function checkName(raw: string, lists: ListDTO[], exceptId?: string): { name: string } | { error: string } {
  const parsed = listName.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "リスト名を入力してください" };
  if (isDuplicateListName(parsed.data, lists, exceptId)) return { error: DUPLICATE_LIST_NAME };
  return { name: parsed.data };
}

const colorStyle = (color: string) => ({ "--c": color }) as CSSProperties;

export function Sidebar(props: Props) {
  const { variant, user, lists, counts, view, onNavigate, onClose } = props;
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ListDTO | null>(null);
  const displayName = user.name || user.email;

  // リンクは普通の <a>(新しいタブでも開ける)。ふつうに押したときはページを読み直さずにビューを切り替える
  function link(target: View) {
    return {
      href: `/tasks${viewSearch(target)}`,
      "aria-current": sameView(view, target) ? ("page" as const) : undefined,
      onClick: (e: MouseEvent<HTMLAnchorElement>) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onNavigate(target);
      },
    };
  }

  return (
    <nav className={`${styles.nav} ${variant === "drawer" ? styles.drawer : ""}`} aria-label="メインメニュー">
      <div className={styles.brandRow}>
        <div className={styles.brand}>
          <div className={styles.logoSm}>
            <CheckIcon size={16} strokeWidth={2.5} />
          </div>
          <span className={styles.brandName}>シンプルTodo</span>
        </div>
        {onClose && (
          <button type="button" className={styles.iconBtn} aria-label="メニューを閉じる" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        )}
      </div>

      <div className={styles.scroll}>
        <ul className={styles.items}>
          <li>
            <a className={styles.navItem} {...link({ kind: "today" })}>
              <SunIcon className={styles.navIcon} />
              <span className={styles.label}>今日</span>
              {counts.today !== null && <span className={styles.count}>{counts.today}</span>}
            </a>
          </li>
          <li>
            <a className={styles.navItem} {...link({ kind: "inbox" })}>
              <InboxIcon className={styles.navIcon} />
              <span className={styles.label}>インボックス</span>
              <span className={styles.count}>{counts.inbox}</span>
            </a>
          </li>
        </ul>

        <h2 className={styles.groupLabel} id={`${variant}-lists`}>
          リスト
        </h2>
        <ul className={styles.items} aria-labelledby={`${variant}-lists`}>
          {lists.map((l) =>
            renamingId === l.id ? (
              <li key={l.id}>
                <NameForm
                  initial={l.name}
                  label={`「${l.name}」の新しい名前`}
                  color={l.color}
                  validate={(raw) => checkName(raw, lists, l.id)}
                  onSubmit={async (name) => {
                    if (name === l.name) return null;
                    return props.onUpdateList(l.id, { name });
                  }}
                  onDone={() => setRenamingId(null)}
                />
              </li>
            ) : (
              <li key={l.id} className={`${styles.row} ${menuId === l.id ? styles.rowMenuOpen : ""}`}>
                <a className={styles.navItem} {...link({ kind: "list", listId: l.id })}>
                  <span className={styles.listDot} style={colorStyle(l.color)} aria-hidden="true" />
                  <span className={styles.label}>{l.name}</span>
                  <span className={styles.count}>{counts.byList.get(l.id) ?? 0}</span>
                </a>
                <ListMenu
                  list={l}
                  open={menuId === l.id}
                  onOpenChange={(open) => setMenuId(open ? l.id : null)}
                  onRename={() => setRenamingId(l.id)}
                  onColor={(color) => void props.onUpdateList(l.id, { color })}
                  onDelete={() => setDeleting(l)}
                />
              </li>
            ),
          )}
          <li>
            {adding ? (
              <NameForm
                initial=""
                label="新しいリストの名前"
                placeholder="リスト名(30文字まで)"
                validate={(raw) => checkName(raw, lists)}
                onSubmit={props.onCreateList}
                onDone={() => setAdding(false)}
              />
            ) : (
              <button type="button" className={`${styles.navItem} ${styles.muted}`} onClick={() => setAdding(true)}>
                <PlusIcon className={styles.navIcon} />
                <span className={styles.label}>リストを追加</span>
              </button>
            )}
          </li>
        </ul>
      </div>

      <div className={styles.account}>
        <div className={styles.avatar} aria-hidden="true">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className={styles.who}>
          <div className={styles.name}>{displayName}</div>
          {user.name && <div className={styles.mail}>{user.email}</div>}
        </div>
        <form action={logout}>
          <LogoutButton />
        </form>
      </div>

      {deleting && (
        <ConfirmDialog
          title="リストを削除"
          message={deleteMessage(deleting, props.taskCountInList(deleting.id))}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            setDeleting(null);
            props.onDeleteList(deleting);
          }}
        />
      )}
    </nav>
  );
}

// 送信中は「ログアウト中…」にして、押したことがわかるようにする
function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.logout} type="submit" disabled={pending} aria-busy={pending || undefined}>
      {pending ? "ログアウト中…" : "ログアウト"}
    </button>
  );
}

// 「『仕事』を削除します。3件のタスクはインボックスへ移ります。」(仕様書 第8章 ルール3)
function deleteMessage(list: ListDTO, taskCount: number) {
  const head = `『${list.name}』を削除します。`;
  return taskCount > 0 ? `${head}${taskCount}件のタスクはインボックスへ移ります。` : `${head}中にタスクはありません。`;
}

// リスト名の入力欄(追加と名前変更で使う)。Enter で保存、Esc でやめる
function NameForm({
  initial,
  label,
  placeholder,
  color,
  validate,
  onSubmit,
  onDone,
}: {
  initial: string;
  label: string;
  placeholder?: string;
  color?: string;
  validate: (raw: string) => { name: string } | { error: string };
  onSubmit: (name: string) => Promise<string | null>;
  onDone: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (saving) return;
    const checked = validate(value);
    if ("error" in checked) {
      setError(checked.error);
      inputRef.current?.focus();
      return;
    }
    setSaving(true);
    const failed = await onSubmit(checked.name);
    setSaving(false);
    if (failed) {
      setError(failed);
      inputRef.current?.focus();
    } else {
      onDone();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.stopPropagation(); // スマホのメニュー(dialog)まで閉じないように
      onDone();
    }
  }

  return (
    <form className={styles.nameForm} onSubmit={submit} noValidate>
      <div className={`${styles.nameField} ${error ? styles.nameFieldError : ""}`}>
        {color ? (
          <span className={styles.listDot} style={colorStyle(color)} aria-hidden="true" />
        ) : (
          <PlusIcon className={styles.navIcon} />
        )}
        <input
          ref={inputRef}
          className={styles.nameInput}
          aria-label={label}
          placeholder={placeholder}
          value={value}
          autoComplete="off"
          enterKeyHint="done"
          disabled={saving}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // 何も変えずに欄から離れたら閉じる(入力途中の名前は消さずに残す)
            if (!saving && value.trim() === initial) onDone();
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {saving && (
        <p className={styles.nameSaving} role="status">
          {initial ? "保存中…" : "作成中…"}
        </p>
      )}
      {error && (
        <p className={styles.nameError} id={errorId} role="alert">
          <AlertIcon />
          {error}
        </p>
      )}
    </form>
  );
}

// 各リストの「…」メニュー: 名前を変更 / 色 / 削除
function ListMenu({
  list,
  open,
  onOpenChange,
  onRename,
  onColor,
  onDelete,
}: {
  list: ListDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  onColor: (color: string) => void;
  onDelete: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `list-menu-${list.id}`;

  // 開いたら最初の項目にフォーカス。メニューの外を押したら閉じる
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("[role^=menuitem]")?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onOpenChange]);

  function close(returnFocus = true) {
    onOpenChange(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  // ↑↓ で項目を移動、Esc で閉じる、Tab でメニューから出たら閉じる
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role^=menuitem]") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? index + 1 : index - 1;
      items[(next + items.length) % items.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <div className={styles.menuWrap} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.more}
        aria-label={`「${list.name}」のメニュー`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => onOpenChange(!open)}
      >
        <DotsIcon />
      </button>
      {open && (
        <div className={styles.menu} id={menuId} role="menu" aria-label={`「${list.name}」のメニュー`} ref={menuRef} onKeyDown={onKeyDown}>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              close(false);
              onRename();
            }}
          >
            <PencilIcon />
            名前を変更
          </button>
          <div className={styles.menuColors} role="group" aria-label="色">
            {LIST_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                role="menuitemradio"
                aria-checked={list.color === c.value}
                aria-label={c.label}
                title={c.label}
                className={styles.colorBtn}
                style={colorStyle(c.value)}
                onClick={() => {
                  if (list.color !== c.value) onColor(c.value);
                }}
              >
                {list.color === c.value && <CheckIcon size={12} strokeWidth={3} />}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            className={`${styles.menuItem} ${styles.menuDanger}`}
            onClick={() => {
              close(false);
              onDelete();
            }}
          >
            <TrashIcon />
            削除
          </button>
        </div>
      )}
    </div>
  );
}
