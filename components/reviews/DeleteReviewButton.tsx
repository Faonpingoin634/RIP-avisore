"use client";

import { useRef } from "react";

import { deleteReviewAction } from "@/app/actions/reviews";
import { FormAlert } from "@/components/ui/form";
import { useServerForm } from "@/components/ui/use-server-form";
import { RETURN_TO_CEMETERY_FIELD } from "@/lib/validation/review";

type Props = {
  reviewId: string;
  cemeteryName: string;
  /** After deletion, go to the cemetery page (needed where the current page stops existing, e.g. the edit page). */
  returnToCemetery?: boolean;
};

/** "Supprimer" with an explicit confirmation dialog before calling the Server Action. */
export default function DeleteReviewButton({ reviewId, cemeteryName, returnToCemetery = false }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { state, pending, onSubmit } = useServerForm(deleteReviewAction);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded-md border border-blood/60 px-3 py-1.5 font-semibold text-blood hover:bg-blood/10"
      >
        Supprimer
      </button>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}

      <dialog
        ref={dialog}
        aria-labelledby={`delete-title-${reviewId}`}
        className="m-auto max-w-md rounded-xl border border-mist bg-tomb p-6 text-bone backdrop:bg-black/70"
      >
        <h2 id={`delete-title-${reviewId}`} className="font-display text-xl font-bold">
          Supprimer cet avis ?
        </h2>
        <p className="mt-2 text-ash">
          Votre avis sur « {cemeteryName} » sera définitivement supprimé. Cette action est irréversible.
        </p>
        <form
          onSubmit={(event) => {
            onSubmit(event);
            dialog.current?.close();
          }}
          className="mt-6 flex flex-wrap justify-end gap-2"
        >
          <input type="hidden" name="reviewId" value={reviewId} />
          {returnToCemetery && <input type="hidden" name={RETURN_TO_CEMETERY_FIELD} value="1" />}
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-md border border-mist px-4 py-2 text-bone hover:bg-vault"
            autoFocus
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-blood px-4 py-2 font-semibold text-crypt hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </form>
      </dialog>
    </>
  );
}
