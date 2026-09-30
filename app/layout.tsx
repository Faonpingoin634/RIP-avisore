import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cinzel, Inter } from "next/font/google";

import SiteHeader from "@/components/layout/SiteHeader";
import "./globals.css";

const title = Cinzel({ variable: "--font-title", subsets: ["latin"], weight: ["600", "700"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "RIP-Advisor — Le TripAdvisor de l'Au-delà",
    template: "%s · RIP-Advisor",
  },
  description:
    "Carte mondiale des cimetières : laissez votre avis sur le voisinage, l'ambiance et le taux d'humidité des caveaux.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr" className={`${title.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />

        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="border-t border-mist bg-tomb px-4 py-3 text-center text-ash">
          Données cartographiques ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            contributeurs OpenStreetMap
          </a>{" "}
          (licence ODbL) · Géocodage Nominatim
        </footer>
      </body>
    </html>
  );
}
