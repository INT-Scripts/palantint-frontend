import type { Metadata } from "next";
import { connection } from "next/server";
import { getPublicClubs } from "@/lib/publicClubs";
import ClubsIndex from "./ClubsIndex";
import PublicClubsPage from "./PublicClubsClient";

export const metadata: Metadata = {
  title: "Clubs et associations de Télécom SudParis et IMT-BS",
  description: "L’annuaire des associations et des clubs du campus d’Évry, communs à Télécom SudParis et IMT-BS : BDE, BDA, ASINT, MiNET et les autres.",
  alternates: { canonical: "/clubs" },
};

export default async function ClubsPage() {
  // The backend is unreachable during the Docker build: render on request.
  await connection();
  const clubs = await getPublicClubs();
  return (
    <>
      <PublicClubsPage />
      <ClubsIndex clubs={clubs} />
    </>
  );
}
