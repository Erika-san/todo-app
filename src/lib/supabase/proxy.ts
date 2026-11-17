// proxy.ts から呼ぶ処理: ログイン状態(Cookie)を更新し、ページの出し分けをする
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ログインが必要なページ
const PROTECTED_PREFIXES = ["/tasks"];
// ログイン中は開かせないページ
const AUTH_PAGES = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // 新しい Cookie を、この後のページ処理(request)とブラウザへの返事(response)の両方に入れる
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          // ログイン情報を含む返事を CDN などに保存させないためのヘッダー
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // 署名を検証してログイン中のユーザーを確かめる(期限切れなら更新もここで行われる)。
  // この呼び出しと createServerClient の間に別の処理を挟まないこと
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.includes(path);

  let redirectTo: string | null = null;
  if (path === "/") redirectTo = isLoggedIn ? "/tasks" : "/login";
  else if (isProtected && !isLoggedIn) redirectTo = "/login";
  else if (isAuthPage && isLoggedIn) redirectTo = "/tasks";

  if (redirectTo) {
    const redirect = NextResponse.redirect(new URL(redirectTo, request.url));
    // 更新した Cookie とヘッダーを移し替える(落とすとログイン状態がずれる)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response.headers.forEach((value, key) => {
      if (/^(cache-control|expires|pragma)$/i.test(key)) redirect.headers.set(key, value);
    });
    return redirect;
  }

  return response;
}
