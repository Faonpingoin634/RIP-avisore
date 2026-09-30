import { z } from "zod";

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
export const PASSWORD_MIN = 8;
// bcrypt, used by Supabase Auth, ignores anything beyond 72 bytes.
export const PASSWORD_MAX = 72;

const email = z
  .string({ error: "L'email est obligatoire." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Adresse email invalide." }).max(254, { error: "Adresse email trop longue." }));

export const signUpSchema = z.object({
  username: z
    .string({ error: "Le pseudo est obligatoire." })
    .trim()
    .regex(USERNAME_PATTERN, {
      error: "Le pseudo doit faire 3 à 30 caractères : lettres sans accents, chiffres ou « _ ».",
    }),
  email,
  password: z
    .string({ error: "Le mot de passe est obligatoire." })
    .min(PASSWORD_MIN, { error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.` })
    .max(PASSWORD_MAX, { error: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX} caractères.` }),
});

export const signInSchema = z.object({
  email,
  password: z.string({ error: "Le mot de passe est obligatoire." }).min(1, { error: "Le mot de passe est obligatoire." }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
