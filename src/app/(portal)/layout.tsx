export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased font-sans selection:bg-zinc-200 selection:text-zinc-800">
      {children}
    </div>
  );
}
