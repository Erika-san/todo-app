// Prisma CLI(マイグレーションなど)の設定。Prisma 7 では接続先をこのファイルに書く
import { defineConfig, env } from "prisma/config";

// Prisma 7 は .env を自動で読まないので、Node.js の機能で .env.local を読み込む。
// Vercel など .env.local が無い環境では、そこで設定された環境変数をそのまま使う
try {
  process.loadEnvFile(".env.local");
} catch {
  // ファイルが無い場合は何もしない
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // マイグレーションは Session pooler(5432)の DIRECT_URL を使う。
    // アプリ実行時の接続(DATABASE_URL / 6543)は src/lib/prisma.ts で別に指定する
    url: env("DIRECT_URL"),
  },
});
