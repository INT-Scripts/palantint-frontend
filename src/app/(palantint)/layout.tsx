import AppWrapper from "@/components/AppWrapper";
import { Toaster } from "@/components/ui/sonner";

export default function PalantintLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 antialiased font-sans">
      <AppWrapper>
        {children}
        <Toaster />
      </AppWrapper>
    </div>
  );
}
