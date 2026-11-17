// ブラウザ用の Supabase クライアント(Client Component で使う)
// ログイン状態は Cookie に保存され、サーバー側と共有される
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
