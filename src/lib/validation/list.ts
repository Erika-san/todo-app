// リストの入力チェック(仕様書 第8章)。画面と API の両方でこのスキーマを使う
import { z } from "zod";
import { LIST_COLOR_VALUES } from "@/lib/list-types";

export const LIST_NAME_MAX = 30;
export const DUPLICATE_LIST_NAME = "同じ名前のリストがあります";

const BODY_ERROR = { error: "リクエストの形式が正しくありません" };

// リスト名: 必須、1〜30文字、前後の空白は削除(同じ名前かどうかは、DB の中身と比べて別に確かめる)
export const listName = z
  .string({ error: "リスト名を入力してください" })
  .trim()
  .min(1, { error: "リスト名を入力してください" })
  .max(LIST_NAME_MAX, { error: "30文字以内で入力してください" });

// 色: 決まった8色のどれか
export const listColor = z.enum(LIST_COLOR_VALUES, { error: "色は決まった8色のどれかを指定してください" });

// POST /api/lists(色は自動で付けるので名前だけ)
export const createListSchema = z.strictObject({ name: listName }, BODY_ERROR);

// PATCH /api/lists/:id … 名前・色の変更(送った項目だけ)
export const updateListSchema = z
  .strictObject({ name: listName.optional(), color: listColor.optional() }, BODY_ERROR)
  .refine((v) => Object.keys(v).length > 0, { error: "変更する項目を指定してください" });

// 画面側の重複チェック(大文字・小文字は区別する。DB の一意制約と同じ)
export function isDuplicateListName(name: string, lists: { id: string; name: string }[], exceptId?: string) {
  return lists.some((l) => l.name === name && l.id !== exceptId);
}

export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
