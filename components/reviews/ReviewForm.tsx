"use client";

import Link from "next/link";
import { useId, useMemo, useState, type FormEvent } from "react";

import { createReviewAction, updateReviewAction } from "@/app/actions/reviews";
import { FieldErrors, FormAlert, SubmitButton } from "@/components/ui/form";
import ScoreInput from "@/components/ui/ScoreInput";
import { useServerForm } from "@/components/ui/use-server-form";
import { fieldErrorsFrom, type FieldErrors as FieldErrorMap } from "@/lib/actions/result";
import type { ReviewVibe } from "@/lib/types";
import { COMMENT_MAX, COMMENT_MIN, reviewFieldsSchema, VIBES_MAX } from "@/lib/validation/review";
import { VIBES } from "@/lib/vibes";

type Initial = { rating: number; humidity: number; vibes: ReviewVibe[]; comment: string };

type Props =
  | { mode: "create"; cemeteryId: string; initial?: undefined }
  | { mode: "edit"; reviewId: string; initial: Initial };

export default function ReviewForm(props: Props) {
  const isEdit = props.mode === "edit";
  const { state, pending, onSubmit: submitToServer, fieldErrors: serverErrors } = useServerForm(
    isEdit ? updateReviewAction : createReviewAction,
  );

  const [rating, setRating] = useState<number | null>(props.initial?.rating ?? null);
  const [humidity, setHumidity] = useState<number | null>(props.initial?.humidity ?? null);
  const [vibes, setVibes] = useState<ReviewVibe[]>(props.initial?.vibes ?? []);
  const [comment, setComment] = useState(props.initial?.comment ?? "");
  // Once the user tried to submit, errors are recomputed live so they vanish as fields get fixed.
  const [attempted, setAttempted] = useState(false);

  const commentId = useId();
  const vibesErrorId = useId();
  const commentLength = [...comment.trim()].length;

  const clientErrors = useMemo<FieldErrorMap>(() => {
    if (!attempted) return {};
    const check = reviewFieldsSchema.safeParse({ rating, humidity, vibes, comment });
    return check.success ? {} : fieldErrorsFrom(check.error);
  }, [attempted, rating, humidity, vibes, comment]);
  const errors = { ...serverErrors, ...clientErrors };

  function toggleVibe(vibe: ReviewVibe) {
    setVibes((current) => (current.includes(vibe) ? current.filter((v) => v !== vibe) : [...current, vibe]));
  }

  // Client-side validation is a convenience only: the Server Action validates again.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    setAttempted(true);
    if (!reviewFieldsSchema.safeParse({ rating, humidity, vibes, comment }).success) {
      event.preventDefault();
      return;
    }
    submitToServer(event);
  }

  const succeeded = state?.ok === true;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {isEdit ? (
        <input type="hidden" name="reviewId" value={props.reviewId} />
      ) : (
        <input type="hidden" name="cemeteryId" value={props.cemeteryId} />
      )}

      {state && !state.ok && (
        <FormAlert>
          {state.error}
          {state.link && (
            <>
              {" "}
              <Link href={state.link.href} className="font-semibold underline">
                {state.link.label}
              </Link>
            </>
          )}
        </FormAlert>
      )}
      {succeeded && <FormAlert tone="success">Merci ! Votre avis a été publié.</FormAlert>}
      {Object.keys(clientErrors).length > 0 && <FormAlert>Le formulaire contient des erreurs.</FormAlert>}

      <ScoreInput name="rating" value={rating} onChange={setRating} errors={errors.rating} />
      <ScoreInput name="humidity" value={humidity} onChange={setHumidity} errors={errors.humidity} />

      <fieldset aria-describedby={errors.vibes ? vibesErrorId : undefined}>
        <legend className="mb-1 font-semibold">
          Ambiance <span className="font-normal text-ash">(1 à {VIBES_MAX} choix)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {VIBES.map((vibe) => {
            const checked = vibes.includes(vibe.value);
            const disabled = !checked && vibes.length >= VIBES_MAX;
            return (
              <label
                key={vibe.value}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-candle ${
                  checked ? "border-candle bg-vault text-bone" : "border-mist text-bone"
                } ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-vault"}`}
              >
                <input
                  type="checkbox"
                  name="vibes"
                  value={vibe.value}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleVibe(vibe.value)}
                  className="h-4 w-4 accent-[var(--color-candle)]"
                />
                <span aria-hidden="true">{vibe.emoji}</span>
                {vibe.label}
              </label>
            );
          })}
        </div>
        <FieldErrors id={vibesErrorId} errors={errors.vibes} />
      </fieldset>

      <div>
        <label htmlFor={commentId} className="mb-1 block font-semibold">
          Commentaire
        </label>
        <textarea
          id={commentId}
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          maxLength={COMMENT_MAX}
          aria-invalid={Boolean(errors.comment)}
          aria-describedby={`${commentId}-count${errors.comment ? ` ${commentId}-error` : ""}`}
          placeholder="Le voisinage, le calme, l'odeur de mousse, les fantômes croisés…"
          className="w-full rounded-md border border-mist bg-vault px-3 py-2 text-bone placeholder:text-ash aria-[invalid=true]:border-blood"
        />
        <p id={`${commentId}-count`} className={commentLength < COMMENT_MIN ? "text-ash" : "text-moss"}>
          {commentLength} / {COMMENT_MAX} caractères ({COMMENT_MIN} minimum)
        </p>
        <FieldErrors id={`${commentId}-error`} errors={errors.comment} />
      </div>

      <FieldErrors id={`${commentId}-ids`} errors={errors.cemeteryId ?? errors.reviewId} />

      <SubmitButton pending={pending} pendingLabel="Envoi…">
        {isEdit ? "Enregistrer les modifications" : "Publier mon avis"}
      </SubmitButton>
    </form>
  );
}
