// Next.js 16 の Proxy(旧 Middleware)。ページを表示する前に毎回動く
// ここでは「軽い確認」だけ行う: ログイン状態の更新と、ページの振り分け(リダイレクト)
// データを守る本番の確認は、サーバー側の src/lib/auth.ts(requireUser)で行う
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 画像・CSS などの静的ファイルでは動かさない
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
