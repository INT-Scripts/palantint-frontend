import Link from "next/link";
import { Layers } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-200/50 to-orange-100/30 dark:from-stone-950 dark:via-stone-900/90 dark:to-amber-950/10 text-stone-900 dark:text-stone-100 antialiased font-sans transition-colors duration-300 relative overflow-x-hidden">
      {/* Dynamic warm dot-grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#beb3a8_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#2c2724_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none z-0 opacity-70" />
      <div className="relative z-10 min-h-screen flex flex-col">
        
        {/* Header */}
        <header className="border-b border-zinc-200/85 dark:border-stone-800/80 bg-white/70 dark:bg-stone-950/70 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-zinc-950 shadow-sm transition-colors">
                <Layers className="w-4 h-4" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-stone-50">INT Portal</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-stone-400">
              <Link href="/clubs" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Clubs</Link>
              <Link href="/foyer" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Foyer</Link>
              <Link href="/apartments" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Apartments</Link>
              <Link href="/laundry" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Laundry</Link>
              <div className="border-l border-zinc-200 dark:border-stone-800/80 h-4" />
              <ThemeToggle />
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-200/85 dark:border-stone-800/80 bg-transparent py-16 mt-auto transition-colors duration-300 relative overflow-hidden">
          {/* Massive graphic watermark text */}
          <div className="w-full text-center select-none pointer-events-none mt-4 -mb-10 transition-colors">
            <span className="text-[14vw] font-black tracking-tighter leading-none text-stone-300 dark:text-stone-800 uppercase font-sans">
              INT PORTAL
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
