// ログイン中のユーザーを確かめる処理(サーバー専用)。
// データを読む・書く前は必ずここを通す(Next.js が勧める「データアクセス層」の考え方)
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrisma } from "@/lib/prisma";

export type CurrentUser = { id: string; name: string; email: string };

// Cookie のトークンの署名を検証してユーザーIDを得る(getSession は使わない: 中身を検証しないため)。
// 同じ表示処理の中で何度呼ばれても、実際の確認は1回だけ(React の cache)
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // ログイン確認はリクエストのたびに行う処理だと Next.js に伝える。
  // (トークンの期限確認で現在時刻を使うため、事前レンダリングの対象にしない)
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (user) return user;

  // users の行が無い(トリガーが失敗した等)場合も、ログイン自体は有効として扱う
  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  return { id: userId, name: "", email };
});

// ログイン必須のページ・処理で使う。未ログインなら /login へ
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
