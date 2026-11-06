import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Campus 3D",
  robots: { index: false, follow: true },
};
export default function CampusLayout({ children }: { children: React.ReactNode }) { return children; }
