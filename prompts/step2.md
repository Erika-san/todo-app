# ステップ2: DB(テーブル作成とRLS)

CLAUDE.md と docs/spec.md(特に第6章 ERD・データ設計、第8章 業務ルール)を読んでから始めてください。

## 前提
- `.env.local` に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / DATABASE_URL / DIRECT_URL が入っている。
  値は表示・出力しないこと。入っているかどうかの確認だけにする。
- Prisma は 7.10.1。この版の正しい設定方法(接続設定を書く場所など)を、AGENTS.md の案内やインストール済みのパッケージの説明で確かめてから書く。古い版の書き方を推測で使わない。
- アプリ実行時は DATABASE_URL(Transaction pooler, 6543)、マイグレーションは DIRECT_URL(Session pooler, 5432)を使う。

## やること
1. Prisma の設定を作り、DB に接続できることを確かめる。
2. 仕様書 第6章どおりに users / lists / tasks の3テーブルを定義する。
   - ID は uuid。users.id は Supabase Auth のユーザーIDと同じ値にする。
   - tasks.status は todo / done、tasks.priority は high / medium / low(初期値 medium)。
   - lists は (user_id, name) で一意。
   - tasks.list_id はリスト削除時に NULL に戻す(ON DELETE SET NULL)。
   - 索引: tasks の (user_id, status, due_date)。
   - DB の列名は snake_case、コード側の名前は camelCase にそろえる。
3. マイグレーションを作って Supabase に反映する。
4. 3テーブルに RLS を設定する(予備の守り)。ポリシーは「user_id(users は id)がログイン中のユーザー本人と一致する行だけ読み書きできる」。
5. Prisma Client を、アプリから使える形で1か所にまとめる(開発中に接続が増え続けない書き方にする)。

## 先に提案して確認をとること
- 新規登録したときに users の行をどう作るか(例: Supabase Auth の登録時に DB 側で自動作成する、または初回ログイン時にアプリ側で作成する)。それぞれの長所・短所と、おすすめを示して、私の確認を待つ。決まった方法はステップ3で実装してよい。
- RLS のポリシーを SQL で書く場合、どこに置いて、どう反映するか。

## 終わったら報告すること
- 作ったファイルと、それぞれの役割
- 実行したコマンドと、その意味
- Supabase の管理画面(Table Editor など)で、3テーブルと RLS ができていることを私が確認する手順
- 次のステップ3の前に、私がやる必要があること(あれば)

区切りのよいところでコミットし、ステップ3には進まず、ここで止まってください。
