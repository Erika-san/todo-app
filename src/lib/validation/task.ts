// タスクの入力チェック(仕様書 第8章)。画面と API の両方でこのスキーマを使う
import { z } from "zod";

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 1000;

// 本文が { ... } の形でないときのメッセージ(Zod の英語の既定文言を出さないため)
const BODY_ERROR = { error: "リクエストの形式が正しくありません" };

// タイトル: 必須、1〜100文字、前後の空白は削除
export const taskTitle = z
  .string({ error: "タイトルを入力してください" })
  .trim()
  .min(1, { error: "タイトルを入力してください" })
  .max(TITLE_MAX, { error: "100文字以内で入力してください" });

// メモ: 任意、1,000文字まで。空なら「メモなし」(null)として保存する
export const taskDescription = z
  .string({ error: "1,000文字以内で入力してください" })
  .max(DESCRIPTION_MAX, { error: "1,000文字以内で入力してください" })
  .nullable()
  .transform((v) => (v === null || v.trim() === "" ? null : v));

// 期限: 任意、日付形式("YYYY-MM-DD")。過去の日付も可。null で「期限なし」
export const taskDueDate = z.iso.date({ error: "正しい日付を選んでください" }).nullable();

export const taskPriority = z.enum(["high", "medium", "low"], {
  error: "優先度は high / medium / low のどれかを指定してください",
});

export const taskStatus = z.enum(["todo", "done"], { error: "status は todo か done を指定してください" });

// POST /api/tasks(タイトルだけ。期限・優先度は詳細パネルで変える。リストはステップ6で足す)
export const createTaskSchema = z.object({ title: taskTitle }, BODY_ERROR);

// PATCH /api/tasks/:id … 送った項目だけを変える(一部更新)。何も送らない・知らない項目は 400
export const updateTaskSchema = z
  .object(
    {
      title: taskTitle.optional(),
      description: taskDescription.optional(),
      dueDate: taskDueDate.optional(),
      priority: taskPriority.optional(),
      status: taskStatus.optional(),
    },
    BODY_ERROR,
  )
  .strict()
  .refine((v) => Object.keys(v).length > 0, { error: "変更する項目を指定してください" });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
