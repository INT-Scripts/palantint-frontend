"use client";

import { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";

const CampusMap = dynamic(() => import("./components/CampusMap"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-zinc-400">Chargement de la carte…</div> });

function CampusContent() {
    useEffect(() => { document.title = "Campus | PalantINT"; }, []);
    // One map: the plan and the 3D view are two camera and rendering modes of it.
    return <main className="relative h-[calc(100dvh-72px)] min-h-[500px] sm:h-[calc(100dvh-80px)]">
        <h1 className="sr-only">Carte du campus</h1>
        <CampusMap />
    </main>;
}

export default function CampusPage() {
    return <Suspense fallback={<div className="h-[75vh] bg-zinc-950" />}><CampusContent /></Suspense>;
}
