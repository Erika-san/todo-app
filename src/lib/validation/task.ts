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

// リスト: リストの ID。null で「インボックス」(どのリストにも入れない)
export const taskListId = z.uuid({ error: "リストが見つかりません" }).nullable();

// POST /api/tasks … タイトルは必須。リスト(無ければインボックス)と期限は、開いているビューに合わせて画面が送る
export const createTaskSchema = z
  .object({ title: taskTitle, listId: taskListId.optional(), dueDate: taskDueDate.optional() }, BODY_ERROR)
  .strict();

// PATCH /api/tasks/:id … 送った項目だけを変える(一部更新)。何も送らない・知らない項目は 400
export const updateTaskSchema = z
  .object(
    {
      title: taskTitle.optional(),
      description: taskDescription.optional(),
      dueDate: taskDueDate.optional(),
      priority: taskPriority.optional(),
      status: taskStatus.optional(),
      listId: taskListId.optional(),
    },
    BODY_ERROR,
  )
  .strict()
  .refine((v) => Object.keys(v).length > 0, { error: "変更する項目を指定してください" });

// GET /api/tasks の絞り込み(仕様書 第7章)
//   ?listId=<リストの ID> または ?listId=inbox … そのリスト / インボックスのタスク
//   ?view=today&today=YYYY-MM-DD … 期限が今日以前の未完了タスク(全リスト横断)。
//     「今日」は利用者の端末の日付で決める(仕様書 第8章 ルール5)ので、画面が端末の日付を today で渡す
//   ?status=todo|done … 未完了 / 完了だけ
export const taskQuerySchema = z
  .strictObject(
    {
      listId: z.union([z.literal("inbox"), z.uuid()], { error: "listId はリストの ID か inbox を指定してください" }).optional(),
      view: z.literal("today", { error: "view は today だけ指定できます" }).optional(),
      today: z.iso.date({ error: "today は YYYY-MM-DD の形で指定してください" }).optional(),
      status: taskStatus.optional(),
    },
    { error: "知らない絞り込みの項目があります" },
  )
  .refine((v) => v.view !== "today" || v.today !== undefined, {
    error: "view=today のときは、端末の今日の日付を today=YYYY-MM-DD で指定してください",
  });

export type TaskQuery = z.infer<typeof taskQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
