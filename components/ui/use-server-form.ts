"use client";

import { startTransition, useActionState, type FormEvent } from "react";

import type { FormState } from "@/lib/actions/result";

type ServerFormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

/**
 * Wraps a Server Action for a form. Submitting through `onSubmit` (instead of
 * the `action` prop) keeps what the user typed when the server rejects it,
 * since React would otherwise reset the form.
 */
export function useServerForm(action: ServerFormAction) {
  const [state, dispatch, pending] = useActionState(action, null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return { state, pending, onSubmit, fieldErrors };
}
