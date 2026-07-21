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
        {children}
      </div>
    </div>
  );
}
