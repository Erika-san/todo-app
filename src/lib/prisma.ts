// アプリから DB を使うときの入り口。サーバー側(Route Handler など)だけで import する
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// アプリ実行時は Transaction pooler(6543)の DATABASE_URL を使う(マイグレーション用の DIRECT_URL とは別)
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL が設定されていません(.env.local を確認してください)");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// 開発中はファイルを保存するたびにコードが読み直される。そのたびに新しい接続を作ると
// 接続が増え続けるので、作ったものを globalThis に置いて使い回す(本番では1回しか読まれない)
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
