// ログイン・新規登録の入力チェック(仕様書 第8章)。画面とサーバーの両方でこのスキーマを使う
import { z } from "zod";

export const PASSWORD_MIN = 8;
export const NAME_MAX = 50;

const email = z
  .string()
  .trim()
  .min(1, { error: "メールアドレスを入力してください" })
  .pipe(z.email({ error: "メールアドレスの形式が正しくありません" }));

const password = z.string().min(PASSWORD_MIN, { error: "8文字以上で入力してください" });

export const loginSchema = z.object({ email, password });

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "名前を入力してください" })
    .max(NAME_MAX, { error: "50文字以内で入力してください" }),
  email,
  password,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

// 項目ごとのエラー(各項目の最初のメッセージだけ)
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function toFieldErrors<T>(error: z.ZodError<T>): FieldErrors<T> {
  const flat = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flat)) {
    if (messages?.[0]) result[key] = messages[0];
  }
  return result as FieldErrors<T>;
}
