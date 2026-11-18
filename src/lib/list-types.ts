// 画面と API でやりとりするリストの形と、リストの色(ブラウザでもサーバーでも使う)

// API が返すリスト。todoCount は中の未完了タスクの数(仕様書 第7章「各リストの未完了数付き」)
export type ListDTO = {
  id: string;
  name: string;
  color: string; // "#3B5BDB" の形
  todoCount: number;
};

// リストに付ける色(8色)。作ったときは、まだ使っていない色を上から順に自動で付ける。
// 先頭の2色はお手本(tokens.css の --list-work / --list-shop)と同じ
export const LIST_COLORS = [
  { value: "#3B5BDB", label: "青" },
  { value: "#2B8A3E", label: "緑" },
  { value: "#E8590C", label: "オレンジ" },
  { value: "#7048E8", label: "紫" },
  { value: "#E03131", label: "赤" },
  { value: "#1098AD", label: "水色" },
  { value: "#D6336C", label: "ピンク" },
  { value: "#8C6D46", label: "茶色" },
] as const;

export type ListColor = (typeof LIST_COLORS)[number]["value"];

export const LIST_COLOR_VALUES = LIST_COLORS.map((c) => c.value) as [ListColor, ...ListColor[]];

// まだ使っていない色の先頭。8色とも使っていたら、リストの数で順番に回す
export function pickListColor(usedColors: (string | null)[]): ListColor {
  const unused = LIST_COLOR_VALUES.find((c) => !usedColors.includes(c));
  return unused ?? LIST_COLOR_VALUES[usedColors.length % LIST_COLOR_VALUES.length];
}

export function colorLabel(color: string): string {
  return LIST_COLORS.find((c) => c.value === color)?.label ?? "";
}
