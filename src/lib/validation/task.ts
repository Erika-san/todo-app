// タスクの入力チェック(仕様書 第8章)。画面と API の両方でこのスキーマを使う
import { z } from "zod";

export const TITLE_MAX = 100;

export const taskTitle = z
  .string({ error: "タイトルを入力してください" })
  .trim()
  .min(1, { error: "タイトルを入力してください" })
  .max(TITLE_MAX, { error: "100文字以内で入力してください" });

// 本文が { ... } の形でないときのメッセージ(Zod の英語の既定文言を出さないため)
const BODY_ERROR = { error: "リクエストの形式が正しくありません" };

// POST /api/tasks(このステップではタイトルだけ。期限・優先度・リストはステップ5〜6で足す)
export const createTaskSchema = z.object({ title: taskTitle }, BODY_ERROR);

// PATCH /api/tasks/:id(このステップでは完了 / 未完了の切り替えだけ)
export const updateTaskSchema = z
  .object(
    {
      status: z.enum(["todo", "done"], { error: "status は todo か done を指定してください" }),
    },
    BODY_ERROR,
  )
  .strict(); // このステップで変えられるのは status だけ。他の項目が来たら 400

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
