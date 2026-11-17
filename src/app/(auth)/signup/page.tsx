// S-02 新規登録(/signup)。ログイン中ならここに来る前に proxy が /tasks へ移す
import type { Metadata } from "next";
import { AuthShell } from "../parts";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "新規登録 | シンプルTodo" };

export default function SignupPage() {
  return (
    <AuthShell title="アカウントを作成" lead="メールアドレスだけで、すぐに始められます">
      <SignupForm />
    </AuthShell>
  );
}
