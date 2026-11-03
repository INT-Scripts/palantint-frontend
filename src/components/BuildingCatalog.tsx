"use client";

import {createContext, useContext, useEffect, useState, type ReactNode} from "react";
import {fetchPublic} from "@/lib/api";
import type {BuildingCatalog} from "@/lib/buildings";

const Context = createContext<BuildingCatalog | null>(null);

export function BuildingCatalogBoundary({children}: {children: ReactNode}) {
    const parent = useContext(Context);
    const [catalog,setCatalog] = useState<BuildingCatalog | null>(null);
    const [error,setError] = useState(false);
    const [retry,setRetry] = useState(0);
    useEffect(()=>{
        if (parent) return;
        const controller = new AbortController();
        fetchPublic("/maps/catalog", {signal:controller.signal}).then(value=>{
            if (!Object.keys(value.all || {}).length) throw new Error("Empty plan catalog");
            setCatalog(value);
        }).catch(()=>{if(!controller.signal.aborted)setError(true);});
        return ()=>controller.abort();
    },[parent,retry]);
    if (parent) return <>{children}</>;
    if (error) return <div role="alert" className="p-8 text-sm text-zinc-500">Le catalogue des plans est indisponible.<button className="ml-3 underline" onClick={()=>{setError(false);setRetry(value=>value+1);}}>Réessayer</button></div>;
    if (!catalog) return <div role="status" className="p-8 text-sm text-zinc-500">Chargement des plans…</div>;
    return <Context.Provider value={catalog}>{children}</Context.Provider>;
}

export function useBuildingCatalog() {
    const catalog = useContext(Context);
    if (!catalog) throw new Error("BuildingCatalogBoundary is required");
    return catalog;
}
