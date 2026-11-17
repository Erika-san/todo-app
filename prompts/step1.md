# ステップ1: 環境づくり

CLAUDE.md と docs/spec.md を読んでから始めてください。

## やること
1. このフォルダに Next.js プロジェクトを作る(TypeScript、App Router、ESLint、`src/` ディレクトリを使う)。
   - すでにある `CLAUDE.md`、`docs/`、`reference/`、`prompts/` は消したり上書きしたりしない。
2. 必要なライブラリを入れる: prisma、@prisma/client、@supabase/supabase-js、@supabase/ssr、zod。
3. `reference/design/html/theme/tokens.css` の blue テーマのトークンを、アプリ全体のCSS変数として読み込む。フォントも同じものを使う。
4. 動作確認用に、トップページに「シンプルTodo」とだけ表示する(トークンの色とフォントが効いているのがわかる程度でよい)。
5. `.env.example` を作り、必要な環境変数の名前だけを書く(値は空)。それぞれ何の値で、Supabase の管理画面のどこで見つかるかをコメントで書く。
6. `.gitignore` に `.env.local` が入っていることを確認する。
7. Git を初期化して、最初のコミットをする。

## 終わったら報告すること
- 何を作り、何を入れたか(それぞれ何のためのものか)
- `npm run dev` で起動して、ブラウザで確認する方法
- 次のステップ2の前に、私がやる必要があること(Supabase のプロジェクト作成と、`.env.local` に値を入れる手順を一つずつ)

ステップ2には進まず、ここで止まってください。
