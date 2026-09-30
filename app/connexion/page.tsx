import type { Metadata } from "next";
import { redirect } from "next/navigation";

import SignInForm from "@/components/auth/SignInForm";
import PageCard from "@/components/ui/PageCard";
import { nextParam, type PageSearchParams } from "@/lib/auth/search-params";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à RIP-Advisor pour donner votre avis sur les cimetières.",
};

export default async function SignInPage({ searchParams }: { searchParams: PageSearchParams }) {
  const next = await nextParam(searchParams);
  if (await getCurrentUser()) redirect(next);

  return (
    <PageCard title="Connexion" intro="Les âmes errantes sont priées de décliner leur identité.">
      <SignInForm next={next} />
    </PageCard>
  );
}
