// 本番の DB にマイグレーションを流すときだけ使う Prisma CLI の設定。
// 使い方: npm run db:migrate:prod / npm run db:status:prod(どちらも --config でこのファイルを指定する)
// ふだんの開発(開発用の DB)は prisma.config.ts を使う。
//
// 本番の値と開発の値が混ざらないように:
// - 読むのは .env.prod.local だけ(.env.local も、手元のシェルの環境変数も見ない)
// - .env.prod.local には本番の DIRECT_URL(Session pooler, 5432)だけを書く。Git には入らない(.env*)
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "prisma/config";

const FILE = ".env.prod.local";

function readProdDirectUrl(): string {
  let text: string;
  try {
    text = readFileSync(FILE, "utf8");
  } catch {
    throw new Error(`${FILE} がありません。本番の DIRECT_URL を書いたファイルを作ってください(CLAUDE.md の運用のメモ)`);
  }
  const url = parseEnv(text).DIRECT_URL;
  if (!url) throw new Error(`${FILE} に DIRECT_URL がありません`);
  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: readProdDirectUrl(),
  },
});
