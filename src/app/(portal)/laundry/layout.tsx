import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Laveries des résidences MAISEL en direct",
  description: "Quelles machines à laver et quels séchoirs sont libres dans les résidences MAISEL du campus d’Évry, avant de descendre son linge.",
  alternates: { canonical: "/laundry" },
};
export default function LaundryLayout({ children }: { children: React.ReactNode }) { return children; }
