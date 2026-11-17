"use client";
// 入力エラーの表示を管理する。
// - 送信前に画面側で Zod のチェックをし、エラーがあれば送信しない
// - サーバーから返ったエラーも表示する
// - 項目を書き直したら、その項目のエラーは消す
import { useState, type FormEvent } from "react";
import type { z } from "zod";
import { toFieldErrors, type FieldErrors } from "@/lib/validation/auth";

export function useFormErrors<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  serverErrors: FieldErrors<T> | undefined,
) {
  const [clientErrors, setClientErrors] = useState<FieldErrors<T>>({});
  const [edited, setEdited] = useState<Set<keyof T>>(new Set());

  function errorOf(field: keyof T): string | undefined {
    if (clientErrors[field]) return clientErrors[field];
    if (edited.has(field)) return undefined;
    return serverErrors?.[field];
  }

  function onEdit(field: keyof T) {
    setEdited((prev) => new Set(prev).add(field));
    setClientErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // 送信時: エラーがあれば送信を止めて表示する。問題なければそのまま送信
  function onSubmit(event: FormEvent<HTMLFormElement>, values: T) {
    const parsed = schema.safeParse(values);
    setEdited(new Set());
    if (!parsed.success) {
      event.preventDefault();
      setClientErrors(toFieldErrors(parsed.error));
      return;
    }
    setClientErrors({});
  }

  return { errorOf, onEdit, onSubmit };
}
