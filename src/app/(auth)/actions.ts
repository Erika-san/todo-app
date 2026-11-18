"use server";
// ログイン・新規登録・ログアウトの処理(サーバーで動く)。
// 画面側でもチェックしているが、画面を通らない送信に備えてここでも同じスキーマで確かめる
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  signupSchema,
  toFieldErrors,
  type FieldErrors,
  type LoginInput,
  type SignupInput,
} from "@/lib/validation/auth";

export type FormState<T> = {
  fieldErrors?: FieldErrors<T>;
  formError?: string;
} | null;

const NETWORK_ERROR = "通信できませんでした。通信状況を確かめて、もう一度お試しください";
const RATE_LIMIT_ERROR = "しばらく時間をおいてから、もう一度お試しください";

// Supabase につながらない・止まっている(通信エラーや 500 番台)。パスワード違いと区別する
function isServiceError(error: { name?: string; status?: number }) {
  return error.name === "AuthRetryableFetchError" || error.status === 0 || (error.status ?? 0) >= 500;
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function login(_prev: FormState<LoginInput>, formData: FormData): Promise<FormState<LoginInput>> {
  const parsed = loginSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (isServiceError(error)) return { formError: NETWORK_ERROR };
    if (error.code === "over_request_rate_limit") return { formError: RATE_LIMIT_ERROR };
    // どちらが違うかは教えない(登録済みのメールアドレスを探られないため)
    return { formError: "メールアドレスまたはパスワードが違います" };
  }
  redirect("/tasks");
}

export async function signup(_prev: FormState<SignupInput>, formData: FormData): Promise<FormState<SignupInput>> {
  const parsed = signupSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const { name, email, password } = parsed.data;
  const supabase = await createClient();
  // 名前は Auth の登録データとして渡す。DB のトリガーが users テーブルにコピーする
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { fieldErrors: { email: "このメールアドレスはすでに登録されています" } };
    }
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
      return { formError: RATE_LIMIT_ERROR };
    }
    if (isServiceError(error)) return { formError: NETWORK_ERROR };
    return { formError: "登録できませんでした。もう一度お試しください" };
  }
  // 確認メールが有効な設定だとここでログインされない(Supabase の Confirm email をオフにしておく)
  if (!data.session) {
    return { formError: "登録しましたが、ログインできませんでした。ログイン画面からお試しください" };
  }
  redirect("/tasks");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
