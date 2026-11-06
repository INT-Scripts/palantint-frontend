import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Logements MAISEL",
  // These prices come from the MAISEL reservation site, behind a campus login:
  // stay out of search results until publishing them there is settled.
  robots: { index: false, follow: true },
};
export default function ApartmentsLayout({ children }: { children: React.ReactNode }) { return children; }
