import type { Metadata } from "next";
import { redirect } from "next/navigation";

import SignUpForm from "@/components/auth/SignUpForm";
import PageCard from "@/components/ui/PageCard";
import { nextParam, type PageSearchParams } from "@/lib/auth/search-params";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Inscription",
  description: "Créez votre compte RIP-Advisor et partagez vos avis sur les cimetières du monde entier.",
};

export default async function SignUpPage({ searchParams }: { searchParams: PageSearchParams }) {
  const next = await nextParam(searchParams);
  if (await getCurrentUser()) redirect(next);

  return (
    <PageCard title="Inscription" intro="Rejoignez la communauté des visiteurs de l'Au-delà.">
      <SignUpForm next={next} />
    </PageCard>
  );
}
