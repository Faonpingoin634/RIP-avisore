"use client";

import Link from "next/link";

import { signUpAction } from "@/app/actions/auth";
import { FormAlert, SubmitButton, TextField } from "@/components/ui/form";
import { useServerForm } from "@/components/ui/use-server-form";
import { PASSWORD_MIN } from "@/lib/validation/auth";

export default function SignUpForm({ next }: { next: string }) {
  const { state, pending, onSubmit, fieldErrors } = useServerForm(signUpAction);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}

      <TextField
        name="username"
        label="Pseudo"
        autoComplete="username"
        required
        minLength={3}
        maxLength={30}
        pattern="[a-zA-Z0-9_]{3,30}"
        hint="3 à 30 caractères : lettres sans accents, chiffres ou « _ ». Il sera visible publiquement."
        errors={fieldErrors.username}
      />
      <TextField name="email" type="email" label="Email" autoComplete="email" required errors={fieldErrors.email} />
      <TextField
        name="password"
        type="password"
        label="Mot de passe"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        hint={`${PASSWORD_MIN} caractères minimum.`}
        errors={fieldErrors.password}
      />

      <SubmitButton pending={pending} pendingLabel="Création du compte…">
        Créer mon compte
      </SubmitButton>

      <p className="text-center text-ash">
        Déjà inscrit ?{" "}
        <Link href={`/connexion?next=${encodeURIComponent(next)}`}>Se connecter</Link>
      </p>
    </form>
  );
}
