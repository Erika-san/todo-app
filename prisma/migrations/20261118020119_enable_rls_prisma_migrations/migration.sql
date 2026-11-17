-- Prisma の履歴表 _prisma_migrations にも RLS をかける
-- この表は public スキーマにあるため、そのままだと公開キーで Supabase に直接アクセスされた場合に
-- 中身(どのマイグレーションをいつ流したか)が読めてしまう。ポリシーは作らない = anon / authenticated からはすべて拒否。
-- Prisma(postgres ロール)は RLS の対象外なので、migrate deploy / status はこれまでどおり動く
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
