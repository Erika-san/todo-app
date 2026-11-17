// S-01 ログイン(/login)。ログイン中ならここに来る前に proxy が /tasks へ移す
import type { Metadata } from "next";
import { AuthShell } from "../parts";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン | シンプルTodo" };

export default function LoginPage() {
  return (
    <AuthShell title="おかえりなさい" lead="シンプルTodo にログイン">
      <LoginForm />
    </AuthShell>
  );
}
