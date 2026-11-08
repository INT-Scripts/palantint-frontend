import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Logements MAISEL",
  // These prices come from the MAISEL reservation site, behind a campus login.
  // The owner decided on 2026-11-08 to keep them out of search results.
  robots: { index: false, follow: true },
};
export default function ApartmentsLayout({ children }: { children: React.ReactNode }) { return children; }
