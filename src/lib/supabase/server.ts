// サーバー用の Supabase クライアント(Server Component / Server Action / Route Handler で使う)
// リクエストごとに新しく作る(使い回すとログイン状態が他の人と混ざるおそれがある)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component の表示中は Cookie を書けない。
            // その場合のログイン状態の更新は proxy.ts が担当するので、ここでは何もしない
          }
        },
      },
    },
  );
}
