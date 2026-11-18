"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { signup, type FormState } from "../actions";
import { PASSWORD_MIN, signupSchema, type SignupInput } from "@/lib/validation/auth";
import { useFormErrors } from "../use-form-errors";
import { ErrorMessage } from "../parts";
import styles from "../auth.module.css";

// パスワードの長さに応じて点灯させるマス数(3マス中)
function meterLevel(length: number) {
  if (length >= PASSWORD_MIN) return 3;
  if (length >= 6) return 2;
  if (length >= 1) return 1;
  return 0;
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState<FormState<SignupInput>, FormData>(signup, null);
  const [values, setValues] = useState<SignupInput>({ name: "", email: "", password: "" });
  const { errorOf, onEdit, onSubmit } = useFormErrors(signupSchema, state?.fieldErrors);
  const [formErrorHidden, setFormErrorHidden] = useState(false);

  // 画面を離れても Next.js は入力内容を残す(戻ったときのため)。パスワードだけは残さず消す
  useEffect(() => () => setValues((v) => ({ ...v, password: "" })), []);

  const nameError = errorOf("name");
  const emailError = errorOf("email");
  const passwordError = errorOf("password");
  const formError = formErrorHidden ? undefined : state?.formError;

  const level = meterLevel(values.password.length);
  const remaining = PASSWORD_MIN - values.password.length;
  const hint = values.password.length > 0 && remaining > 0 ? `あと${remaining}文字(${PASSWORD_MIN}文字以上)` : `${PASSWORD_MIN}文字以上`;

  function change(field: keyof SignupInput, value: string) {
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
          <label className={styles.label} htmlFor="su-name">名前</label>
          <input
            className={styles.input}
            id="su-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="例: Erika"
            value={values.name}
            onChange={(e) => change("name", e.target.value)}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? "su-name-err" : undefined}
          />
          {nameError && <ErrorMessage id="su-name-err">{nameError}</ErrorMessage>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="su-email">メールアドレス</label>
          <input
            className={styles.input}
            id="su-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={(e) => change("email", e.target.value)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "su-email-err" : undefined}
          />
          {emailError && <ErrorMessage id="su-email-err">{emailError}</ErrorMessage>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="su-pw">パスワード</label>
          <input
            className={styles.input}
            id="su-pw"
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => change("password", e.target.value)}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby="su-pw-hint"
          />
          <div className={`${styles.meter} ${level === 3 ? styles.done : ""}`} aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= level ? styles.on : undefined} />
            ))}
          </div>
          {passwordError ? (
            <ErrorMessage id="su-pw-hint">{passwordError}</ErrorMessage>
          ) : (
            <p className={styles.msg} id="su-pw-hint">{hint}</p>
          )}
        </div>
        {formError && <ErrorMessage id="su-form-err">{formError}</ErrorMessage>}
        <button className={styles.primary} type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "登録中…" : "登録してはじめる"}
        </button>
      </form>
      <p className={styles.switch}>
        すでにアカウントがある方は <Link href="/login">ログイン</Link>
      </p>
    </>
  );
}
