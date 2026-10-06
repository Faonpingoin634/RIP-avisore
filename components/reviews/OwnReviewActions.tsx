import Link from "next/link";

import { buttonStyles } from "@/components/ui/styles";
import { editReviewPath } from "@/lib/types";
import DeleteReviewButton from "./DeleteReviewButton";

/** « Modifier » and « Supprimer » for the author's own review. */
export default function OwnReviewActions({ reviewId, cemeteryName }: { reviewId: string; cemeteryName: string }) {
  return (
    <>
      <Link href={editReviewPath(reviewId)} className={buttonStyles.primarySmall}>
        Modifier
      </Link>
      <DeleteReviewButton reviewId={reviewId} cemeteryName={cemeteryName} />
    </>
  );
}
