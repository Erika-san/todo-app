// API(Route Handler)の共通処理: ログイン確認とエラーの返し方(仕様書 第7章)
import { z } from "zod";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

// 本文は { "error": "メッセージ" } にそろえる
export function errorResponse(status: 400 | 401 | 404 | 500, message: string) {
  return Response.json({ error: message }, { status });
}

export const notFound = () => errorResponse(404, "タスクが見つかりません");
export const listNotFound = () => errorResponse(404, "リストが見つかりません");

// ログイン中のユーザーを返す。未ログインなら 401 のレスポンスを返す
export async function requireApiUser(): Promise<{ user: CurrentUser } | { response: Response }> {
  const user = await getCurrentUser();
  if (!user) return { response: errorResponse(401, "ログインしてください") };
  return { user };
}

// リクエスト本文(JSON)を読んで Zod でチェックする。だめなら 400 のレスポンスを返す
export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: errorResponse(400, "リクエストの形式が正しくありません") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { response: errorResponse(400, parsed.error.issues[0]?.message ?? "入力が正しくありません") };
  }
  return { data: parsed.data };
}

// URL の ID が uuid の形か(形が違えば「存在しない ID」として 404 にする)
export function isUuid(value: string) {
  return z.uuid().safeParse(value).success;
}
