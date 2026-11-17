-- =========================================================
-- Supabase Auth との結びつけ と RLS(手書きのマイグレーション)
-- schema.prisma では書けない Supabase 固有の設定をここに置く。
-- 反映は `npx prisma migrate deploy`(CLAUDE.md の「マイグレーションの手順」参照)
-- =========================================================


-- ---------------------------------------------------------
-- 1. users.id を Supabase Auth のユーザー(auth.users)に結びつける
--    Auth 側でユーザーを消すと、users の行 → その人の lists / tasks まで連鎖して消える
-- ---------------------------------------------------------
ALTER TABLE public.users
  ADD CONSTRAINT users_id_auth_fkey
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;


-- ---------------------------------------------------------
-- 2. 新規登録したら users の行を自動で作るトリガー
--    - SECURITY DEFINER: 登録処理(Auth)の権限ではなく、関数の持ち主の権限で public.users に書く
--    - SET search_path = '': 関数内でテーブル名の解決先を固定せず、すべて public. / auth. 付きで書く。
--      search_path を書き換えて別のテーブルを読ませる攻撃を防ぐための書き方
--    - データが欠けていても登録自体は失敗させない:
--        名前が無い/空 → メールの @ より前 → それも無ければ空文字。50文字を超えたら切る
--        メールが無い → 空文字
--        それでも行が作れない(想定外のエラー)→ 警告をログに残し、登録はそのまま通す
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    LEFT(
      COALESCE(
        NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'name'), ''),
        NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
        ''
      ),
      50
    )
  )
  ON CONFLICT (id) DO NOTHING;  -- 同じIDの行が既にあれば何もしない
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: users の行を作れませんでした (id=%): %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- この関数はトリガー専用。画面側(anon / authenticated)から直接呼べないようにする
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------
-- 3. RLS(行単位のアクセス制限)。予備の守り
--    アプリは Prisma(管理者権限)で接続するので RLS は効かない。API 側の user_id 絞り込みが本命。
--    RLS は、公開キーで Supabase に直接アクセスされた場合などに備える
--    ポリシー: ログイン中のユーザー(authenticated)が、自分の行だけ読み書きできる。
--              未ログイン(anon)には何も見せない(ポリシーが無い = すべて拒否)
--    (SELECT auth.uid()) と括弧で包むのは、行ごとに関数を呼ばず1回の計算で済ませるため
-- ---------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- users は id がログイン中のユーザー本人
CREATE POLICY users_own_rows ON public.users
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- lists / tasks は user_id がログイン中のユーザー本人
CREATE POLICY lists_own_rows ON public.lists
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY tasks_own_rows ON public.tasks
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
