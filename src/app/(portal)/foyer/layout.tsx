import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Plan du foyer du campus d’Évry",
  description: "Les plans des locaux associatifs du foyer, sur le campus de Télécom SudParis et IMT-BS à Évry : qui occupe quelle salle, étage par étage.",
  alternates: { canonical: "/foyer" },
};
export default function FoyerLayout({ children }: { children: React.ReactNode }) { return children; }
