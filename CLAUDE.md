# シンプルTodo — 本番アプリ

個人用のWeb Todoアプリ。PCとスマホのブラウザで使う。

## 技術構成
- Next.js(App Router, TypeScript)
- Prisma + Supabase(PostgreSQL)
- 認証: Supabase Auth(メール+パスワード)、`@supabase/ssr` を使う
- 入力チェック: Zod(画面とAPIで同じスキーマを使い回す)
- 公開: Vercel(GitHub に push で自動デプロイ)

## 参考資料(読むだけ。編集しない)
- `docs/spec.md` … 仕様書。機能・画面・API・DB・ルールの正解はここ。
- `references/design/html/` … デザインのお手本(静的HTML)。見た目はこれに合わせる。
- `references/design/html/theme/tokens.css` … 色・フォント・角丸などのトークン。本番でもCSS変数としてそのまま使う。標準テーマは blue。

## 開発の進め方
仕様書 第9章の順に、1ステップずつ進める。各ステップの終わりに必ず止まって報告し、私の確認を待つ。

1. 環境づくり(Next.js作成、ライブラリ導入、Git)
2. DB(Prismaで users / lists / tasks を定義、マイグレーション、RLS)
3. 認証(ログイン、新規登録、未ログイン時のリダイレクト)
4. タスクの基本(追加、一覧、完了の切り替え)→ Vercel に公開してスマホで確認
5. 編集と削除(詳細パネル、期限、優先度)
6. リストと「今日」ビュー、絞り込み
7. 仕上げ(空の表示、エラー表示、スマホ表示の確認)

## DB の変更(マイグレーション)の手順
テーブルを足す・列を変えるときは、必ずこの手順で行う。接続先は `prisma.config.ts` の DIRECT_URL(Session pooler, 5432)。

1. `prisma/schema.prisma` を書き換える。
2. 前回コミットした schema と今の schema を比べて、差分の SQL をファイルに書き出す(DB には触らない)。
   ```
   git show HEAD:prisma/schema.prisma > prisma/.prev-schema.prisma
   mkdir prisma/migrations/<YYYYMMDDHHMMSS>_<内容がわかる名前>
   npx prisma migrate diff --from-schema prisma/.prev-schema.prisma --to-schema prisma/schema.prisma --script > prisma/migrations/<同じフォルダ名>/migration.sql
   rm prisma/.prev-schema.prisma
   ```
3. できた `migration.sql` を読んで中身を確かめる。テーブルを新しく作ったときは、RLS の有効化とポリシーも同じファイルに手で書き足す(Supabase 固有の設定は schema.prisma に書けないため)。
4. `npx prisma migrate deploy` で Supabase に反映する(まだ反映していないマイグレーションを順番に流す)。
5. `npx prisma migrate status` で「Database schema is up to date!」を確認し、`npx prisma generate` でコード側の型を作り直す。
6. `schema.prisma` と `migration.sql` を同じコミットに入れる(次回の手順2は、このコミットの schema を比べる元にするため)。

使わないコマンドと理由:
- `prisma migrate dev`: 一時的な空のDB(シャドウDB)で試すが、そこには Supabase の `auth` スキーマが無く、トリガーや `auth.users` への外部キーで失敗する。
- `prisma migrate diff --from-config-datasource`(DB と比べる): `users` が `auth.users` を参照しているため、Prisma が「別スキーマへの参照」としてエラー(P4002)を出す。
- `prisma db push` / `prisma migrate reset`: 履歴が残らない/DB の中身を全部消すため。

## 守ること
- **データの持ち主チェック**: Prisma はDBに管理者権限で接続するため、Supabase の RLS が効かない。API では必ずログイン中のユーザーの user_id で絞り込み、他人のデータは 404 を返す。RLS は予備の守りとして設定しておく。
- **秘密の値**: `.env.local` に書き、Git に入れない(`.gitignore` を確認)。service_role キーは画面側のコードで絶対に使わない。秘密の値をチャットや報告に書かない。
- 仕様書にない機能を勝手に足さない。必要だと思ったら提案して確認をとる。
- コマンドを実行する前に、何をするコマンドか一言説明する。ソフトのインストールや設定の変更は、先に確認をとる。
- バックアップやスクショは一時フォルダではなく、プロジェクト内(`screenshots/` など)に保存する。
- 各ステップの終わりに、動作確認の方法(私が何をすれば確かめられるか)も報告する。
- 区切りのよいところで Git にコミットする。コミットメッセージは日本語でよい。

## 説明のしかた
私は Next.js / Prisma / Supabase を使ったことはあるが、詳しくはない。コマンドや設定を変えるときは、各行の意味と、なぜそうするのかも説明すること。
