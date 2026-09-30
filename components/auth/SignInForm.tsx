"use client";

import Link from "next/link";

import { signInAction } from "@/app/actions/auth";
import { FormAlert, SubmitButton, TextField } from "@/components/ui/form";
import { useServerForm } from "@/components/ui/use-server-form";

export default function SignInForm({ next }: { next: string }) {
  const { state, pending, onSubmit, fieldErrors } = useServerForm(signInAction);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}

      <TextField name="email" type="email" label="Email" autoComplete="email" required errors={fieldErrors.email} />
      <TextField
        name="password"
        type="password"
        label="Mot de passe"
        autoComplete="current-password"
        required
        errors={fieldErrors.password}
      />

      <SubmitButton pending={pending} pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>

      <p className="text-center text-ash">
        Pas encore de compte ?{" "}
        <Link href={`/inscription?next=${encodeURIComponent(next)}`}>Créer un compte</Link>
      </p>
    </form>
  );
}
