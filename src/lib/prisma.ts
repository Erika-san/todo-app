// アプリから DB を使うときの入り口。サーバー側(Route Handler / Server Action / Server Component)だけで使う
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

type PrismaClientInstance = ReturnType<typeof createPrismaClient>;

// 1つだけ作って使い回す。開発中はファイルを保存するたびにコードが読み直されるので、
// globalThis に置いて、読み直しのたびに接続が増え続けないようにする
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientInstance };

// 初めて使うときに作る(ファイルを読み込んだ時点では作らない)。
// Next.js の事前レンダリング中に Prisma の初期化処理(現在時刻の取得など)が走るのを避けるため
export function getPrisma(): PrismaClientInstance {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
