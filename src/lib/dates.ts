// 日付の扱い(ブラウザで使う)。「今日」「期限切れ」は利用者の端末の日付で判定する(仕様書 第8章 ルール5)
// 期限は時刻なしの "YYYY-MM-DD" 文字列のまま比べる(タイムゾーンで日付がずれないように)

import type { TaskDTO } from "@/lib/task-types";

const pad = (n: number) => String(n).padStart(2, "0");

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 端末の今日("YYYY-MM-DD")
export function todayLocal(): string {
  return toYmd(new Date());
}

// "YYYY-MM-DD" に日数を足す
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return toYmd(new Date(y, m - 1, d + days));
}

// 一覧に出す期限の言葉: 今日・明日・昨日は言葉で、それ以外は「月/日」
export function dueLabel(due: string, today: string): string {
  if (due === today) return "今日";
  if (due === addDays(today, 1)) return "明日";
  if (due === addDays(today, -1)) return "昨日";
  const [, m, d] = due.split("-").map(Number);
  return `${m}/${d}`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 詳細パネル用: 「11/16(月)」
export function dueWithWeekday(due: string): string {
  const [y, m, d] = due.split("-").map(Number);
  return `${m}/${d}(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

// 期限切れ = 未完了で、期限が今日より前(完了したタスクは赤くしない)
export function isOverdue(task: Pick<TaskDTO, "status" | "dueDate">, today: string): boolean {
  return task.status === "todo" && task.dueDate !== null && task.dueDate < today;
}

// 作成日時(ISO)を端末の日付の「月/日」に
export function localMonthDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
