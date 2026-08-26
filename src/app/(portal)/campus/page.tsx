"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";

// Three.js/Canvas rendering breaks under SSR hydration — must be client-only.
const PublicCampusMap = dynamic(() => import("./components/PublicCampusMap"), { ssr: false });

export default function PortalCampusPage() {
  useEffect(() => {
    document.title = "Campus 3D | INT Portal";
  }, []);

  return (
    <section className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 relative z-10 flex flex-col">
      <PortalHeader
        icon={<MapPin className="w-4 h-4" />}
        badgeText="Digital Twin"
        title="Campus 3D Map"
        subtitle="Explore a live 3D reconstruction of the campus. Sign in to browse individual buildings."
        accentColor="blue"
      />

      <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-xs mt-8 flex-1 min-h-[800px] flex flex-col">
        <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0">
          <MapPin className="w-4 h-4 text-blue-500" />
          Campus 3D Map
        </h3>
        <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-950/50">
          <PublicCampusMap />
        </div>
      </div>
    </section>
  );
}
