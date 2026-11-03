"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Map, Box } from "lucide-react";

const LocalPhotogrammetryMap = dynamic(() => import("./components/LocalPhotogrammetryMap"), { ssr: false });
const IndoorCampusMap = dynamic(() => import("./components/IndoorCampusMap"), { ssr: false, loading: () => <div className="flex h-[65vh] items-center justify-center text-sm text-zinc-400">Chargement de la carte…</div> });

function CampusContent() {
    useEffect(() => { document.title = "Campus | PalantINT"; }, []);
    const params = useSearchParams();
    const pathname = usePathname();
    const show3D = params.get("view") === "3d";
    const changeView = (show: boolean) => {
        const next = new URLSearchParams(window.location.search);
        if (show) next.set("view", "3d"); else next.delete("view");
        window.history.pushState(null, "", `${pathname}${next.size ? `?${next}` : ""}`);
    };
    return <main className="relative h-[calc(100dvh-72px)] min-h-[500px] sm:h-[calc(100dvh-80px)]">
        <h1 className="sr-only">Carte du campus</h1>
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 rounded-none border border-zinc-800 bg-zinc-950/90 p-1 shadow-xl backdrop-blur-xl" aria-label="Vue du campus">
            {[{ show: false, label: "Plan", icon: Map }, { show: true, label: "Vue 3D", icon: Box }].map(({ show, label, icon: Icon }) => <button key={label} title={label} aria-label={label} aria-pressed={show3D === show} onClick={() => changeView(show)} className={`rounded-none p-2.5 ${show3D === show ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"}`}><Icon className="h-4 w-4" /></button>)}
        </div>
        {show3D ? <LocalPhotogrammetryMap /> : <IndoorCampusMap />}
    </main>;

}

export default function CampusPage() {
    return <Suspense fallback={<div className="h-[75vh] bg-zinc-950" />}><CampusContent /></Suspense>;
}
