import type { InputHTMLAttributes, ReactNode } from "react";

export const inputClass =
  "w-full rounded-md border border-mist bg-vault px-3 py-2 text-bone placeholder:text-ash aria-[invalid=true]:border-blood";

export function FieldErrors({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <ul id={id} className="mt-1 text-blood">
      {errors.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  hint?: ReactNode;
  errors?: string[];
};

/** Labelled input with hint and error messages wired through aria-describedby. */
export function TextField({ name, label, hint, errors, id, ...inputProps }: TextFieldProps) {
  const inputId = id ?? `field-${name}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const invalid = Boolean(errors && errors.length > 0);
  const describedBy = [hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={inputClass}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-ash">
          {hint}
        </p>
      )}
      <FieldErrors id={errorId} errors={errors} />
    </div>
  );
}

export function FormAlert({ tone = "error", children }: { tone?: "error" | "success"; children: ReactNode }) {
  const color = tone === "error" ? "border-blood/60 text-blood" : "border-moss/60 text-moss";
  return (
    <div role="alert" className={`rounded-md border bg-crypt px-3 py-2 ${color}`}>
      {children}
    </div>
  );
}

export function SubmitButton({ pending, children, pendingLabel }: { pending: boolean; children: ReactNode; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="w-full rounded-md bg-candle px-4 py-2.5 font-semibold text-crypt hover:bg-candle-dark disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
