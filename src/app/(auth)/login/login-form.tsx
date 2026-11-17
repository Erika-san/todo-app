"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { login, type FormState } from "../actions";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { useFormErrors } from "../use-form-errors";
import { ErrorMessage } from "../parts";
import styles from "../auth.module.css";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState<LoginInput>, FormData>(login, null);
  const [values, setValues] = useState<LoginInput>({ email: "", password: "" });
  const { errorOf, onEdit, onSubmit } = useFormErrors(loginSchema, state?.fieldErrors);
  const [formErrorHidden, setFormErrorHidden] = useState(false);

  // 画面を離れても Next.js は入力内容を残す(戻ったときのため)。パスワードだけは残さず消す
  useEffect(() => () => setValues((v) => ({ ...v, password: "" })), []);

  const emailError = errorOf("email");
  // パスワード欄の下には「項目のエラー」か「ログイン失敗」のどちらかを出す
  const passwordError = errorOf("password") ?? (formErrorHidden ? undefined : state?.formError);

  function change(field: keyof LoginInput, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    onEdit(field);
    setFormErrorHidden(true);
  }

  return (
    <>
      <form
        className={styles.card}
        action={formAction}
        noValidate
        onSubmit={(e) => {
          setFormErrorHidden(false);
          onSubmit(e, values);
        }}
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">メールアドレス</label>
          <input
            className={styles.input}
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={(e) => change("email", e.target.value)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "login-email-err" : undefined}
          />
          {emailError && <ErrorMessage id="login-email-err">{emailError}</ErrorMessage>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-pw">パスワード</label>
          <input
            className={styles.input}
            id="login-pw"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => change("password", e.target.value)}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "login-pw-err" : undefined}
          />
          {passwordError && <ErrorMessage id="login-pw-err">{passwordError}</ErrorMessage>}
        </div>
        <button className={styles.primary} type="submit" disabled={pending} aria-busy={pending}>
          ログイン
        </button>
      </form>
      <p className={styles.switch}>
        アカウントがない方は <Link href="/signup">新規登録</Link>
      </p>
    </>
  );
}
