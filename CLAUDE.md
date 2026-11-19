# シンプルTodo — 本番アプリ

個人用のWeb Todoアプリ。PCとスマホのブラウザで使う。MVP(仕様書の Must 機能 F-01〜F-12)は 2026-11-19 に完成した。

## 技術構成
- Next.js 16(App Router, TypeScript)+ React 19。Middleware は Next.js 16 で `src/proxy.ts`(Proxy)になった
- Prisma 7 + Supabase(PostgreSQL)。接続は `@prisma/adapter-pg`、設定は `prisma.config.ts`(開発用の DB)と `prisma.prod.config.ts`(本番の DB)
- 認証: Supabase Auth(メール+パスワード)、`@supabase/ssr` を使う。サーバーでのログイン確認は `getClaims()`
- 入力チェック: Zod 4(画面とAPIで同じスキーマを使い回す)
- 公開: Vercel(GitHub に push で自動デプロイ)。サーバーの処理は Vercel のソウル(icn1、`vercel.json`)、DB は Supabase のソウル(ap-northeast-2)
- 本番: https://todo-app-rho-steel-65.vercel.app

### 環境
| 環境 | ブランチ | Supabase | 環境変数の置き場所 | URL |
|---|---|---|---|---|
| 本番 | `main` | 本番のプロジェクト | Vercel の Production | https://todo-app-rho-steel-65.vercel.app |
| Preview | `dev`(と `main` 以外のすべてのブランチ) | 開発用のプロジェクト | Vercel の Preview | push のたびに Vercel が作る URL(Vercel へのログインが必要) |
| 手元 | 作業中のブランチ | 開発用のプロジェクト | `.env.local` | http://localhost:3000 |

本番の DB にマイグレーションを流すときだけ、手元の `.env.prod.local`(本番の DIRECT_URL だけを書く)を使う。

## 参考資料
- `docs/spec.md` … 仕様書。機能・画面・API・DB・ルールの正解はここ(claude.ai のドキュメント版は更新しない)。機能を変えたら、私の確認をとってから仕様書も直す。
- `references/design/html/` … デザインのお手本(静的HTML)。見た目はこれに合わせる。読むだけで編集しない。
- `references/design/html/theme/tokens.css` … 色・フォント・角丸などのトークン。本番でもCSS変数としてそのまま使う(`src/styles/tokens.css` に blue テーマを写してある)。標準テーマは blue。

## 開発の進め方(MVP 完成後)
機能を足す・変えるときは、この順に進める。区切りごとに止まって報告し、私の確認を待つ。`main` には直接コミットしない。

1. 足したい機能を聞き、仕様書のどこをどう変えるかを先に一覧で出して、確認をとる。
2. `dev` ブランチで作業する。DB を変えるときは、下の「DB の変更の手順」で、まず開発用の DB に反映する。
3. 作る。
4. Playwright で PC(1280幅)とスマホ(390幅)の両方を確かめ、スクショを `screenshots/<内容がわかる名前>/` に保存する(手元 = 開発用の DB で)。
5. 仕様書(`docs/spec.md`)を、作ったものに合わせて直す。
6. コミットして `dev` に push し、Vercel の Preview で確かめる。
7. 報告して止まる(作ったもの・変えたもの、私が確かめる手順、仕様書と違う所や判断した所)。
8. 私の OK のあと、本番に出す:
   1. DB を変えたときは、私の確認をとってから本番の DB に反映する(`npm run db:migrate:prod` → `npm run db:status:prod`)。
   2. GitHub で `dev` → `main` のプルリクエストを作り、マージする(私が行う。`gh` は入っていない)。
   3. 本番で確かめて報告する。

これまでのステップ1〜7(環境づくり → DB → 認証 → タスクの基本と公開 → 編集と削除 → リストと「今日」ビュー → 仕上げ)はすべて完了済み。

## DB の変更(マイグレーション)の手順
テーブルを足す・列を変えるときは、必ずこの手順で行う。`dev` ブランチで作業する。

1. `prisma/schema.prisma` を書き換える。
2. 前回コミットした schema と今の schema を比べて、差分の SQL をファイルに書き出す(DB には触らない)。
   ```
   git show HEAD:prisma/schema.prisma > prisma/.prev-schema.prisma
   mkdir prisma/migrations/<YYYYMMDDHHMMSS>_<内容がわかる名前>
   npx prisma migrate diff --from-schema prisma/.prev-schema.prisma --to-schema prisma/schema.prisma --script > prisma/migrations/<同じフォルダ名>/migration.sql
   rm prisma/.prev-schema.prisma
   ```
3. できた `migration.sql` を読んで中身を確かめる。テーブルを新しく作ったときは、RLS の有効化とポリシーも同じファイルに手で書き足す(Supabase 固有の設定は schema.prisma に書けないため)。
4. **開発用の DB** に反映する: `npm run db:migrate:dev`(`.env.local` の DIRECT_URL を使う)。
5. `npm run db:status:dev` で「Database schema is up to date!」を確認し、`npx prisma generate` でコード側の型を作り直す。
6. `schema.prisma` と `migration.sql` を同じコミットに入れ、`dev` に push して Preview で確かめる(次回の手順2は、このコミットの schema を比べる元にするため)。
7. **本番の DB** には、`main` に入れる直前に反映する。**実行する前に、毎回必ず私の確認をとる。** OK が出たら `npm run db:migrate:prod`(`.env.prod.local` の DIRECT_URL だけを使う)、続けて `npm run db:status:prod` で最新になったことを確かめる。

**DB の変更は「足すだけ」にする**: 本番の DB を先に変えるので、マージして本番のデプロイが終わるまでの少しの間、古いコードが新しい DB で動く。列やテーブルを足すのはよいが、消す・名前を変えるときは2回に分ける(1回目で新しい形を足してコードを切り替え、2回目で古い形を消す)。

使わないコマンドと理由:
- `prisma migrate dev`: 一時的な空のDB(シャドウDB)で試すが、そこには Supabase の `auth` スキーマが無く、トリガーや `auth.users` への外部キーで失敗する。
- `prisma migrate diff --from-config-datasource`(DB と比べる): `users` が `auth.users` を参照しているため、Prisma が「別スキーマへの参照」としてエラー(P4002)を出す。
- `prisma db push` / `prisma migrate reset`: 履歴が残らない/DB の中身を全部消すため。

## 守ること
- **データの持ち主チェック**: Prisma はDBに管理者権限で接続するため、Supabase の RLS が効かない。API では必ずログイン中のユーザーの user_id で絞り込み、他人のデータは 404 を返す。RLS は予備の守りとして設定しておく。
- **本番の DB へのマイグレーション**: `npm run db:migrate:prod` は、**実行する前に毎回必ず私の確認をとる**(何を流すか、つまり反映していないマイグレーションの名前と中身を見せてから)。`db:status:prod`(見るだけ)はこの限りではない。
- **本番の値と開発の値を混ぜない**: 開発用の値は `.env.local` と Vercel の Preview、本番の値は `.env.prod.local`(DIRECT_URL だけ)と Vercel の Production に置く。`.env.production.local` という名前は使わない(手元で `next build` / `next start` をすると Next.js が自動で読み、本番の DB につながってしまうため)。
- **テスト用ユーザー**: 試験は開発用の DB で行うのを基本にする。本番の DB には本物のアカウントが入っている。
  - テスト用ユーザーは、必ず `<内容>-<記号>@example.com` の形で作る(例: `step7-a@example.com`)。
  - 後片付けでは、その形に当てはまるユーザーだけを消す。消す前に、何を何件消すかを確かめて報告する。
  - 本物のアカウント(私のアカウントと、私の知り合いのアカウント)と、そのデータには触らない。見覚えのないアカウントがあっても消さず、報告だけする。
- **秘密の値**: `.env.local` と `.env.prod.local` に書き、Git に入れない(`.gitignore` の `.env*`)。service_role キーは画面側のコードで絶対に使わない。秘密の値をチャットや報告に書かない。
- 仕様書にない機能を勝手に足さない。必要だと思ったら提案して確認をとる。
- コマンドを実行する前に、何をするコマンドか一言説明する。ソフトのインストールや設定の変更は、先に確認をとる。
- バックアップやスクショは一時フォルダではなく、プロジェクト内(`screenshots/` など)に保存する。
- 報告には、動作確認の方法(私が何をすれば確かめられるか)も書く。
- 区切りのよいところで Git にコミットする。コミットメッセージは日本語でよい。

## 運用のメモ
- **DB を変えるとき**: 「開発用の DB に反映 → `dev` で確かめる → 本番の DB に反映(私の確認のあと)→ `main` にマージ」の順にする(先にマージすると、新しいコードが古い DB で動いてしまう)。
- **Vercel の環境変数**: NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY、DATABASE_URL の3つを、Production(本番の Supabase の値)と Preview(開発用の Supabase の値。すべての Preview ブランチ)に分けて置く。DIRECT_URL(マイグレーション用)は Vercel に置かない。
- **Supabase は2つ**: 本番のプロジェクトと開発用のプロジェクト(無料プランで同時に動かせるのは2つまで)。どちらも使わない期間が続くと一時停止される。止まったらダッシュボードから再開する。開発用のプロジェクトも Auth の「Confirm email」はオフ。
- **DB への接続**: Supabase の Shared Pooler(IPv4)を使う。DATABASE_URL は Transaction pooler(6543、`?pgbouncer=true`)、DIRECT_URL は Session pooler(5432)。`db.<ref>.supabase.co` は IPv6 だけなのでつながらない。
- **Vercel のデプロイ**: Vercel を GitHub につないだ直後は、新しい push をしないとデプロイが始まらない(つなぐ前のコミットは拾われない)。そのときは空のコミット(`git commit --allow-empty`)を push すればよい。
- **Preview の URL**: 標準では Vercel にログインしていないと開けない(Deployment Protection)。スマホで確かめるときも、Vercel にログインしたブラウザで開く。
- **Windows でのコツ**:
  - dev サーバーは、止めたあとも node が残ることがある。ポートで探して止める(`netstat -ano | grep :<ポート>` → `taskkill //PID <番号> //T //F`)。
  - `git push` がログイン待ちで止まるときは、私が `! git push` で実行する。

## 説明のしかた
私は Next.js / Prisma / Supabase を使ったことはあるが、詳しくはない。コマンドや設定を変えるときは、各行の意味と、なぜそうするのかも説明すること。
