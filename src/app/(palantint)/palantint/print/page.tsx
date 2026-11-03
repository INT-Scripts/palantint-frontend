"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { History, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { fetchPrivate } from "@/lib/api";
import PrintTab from "./components/PrintTab";
import RequestsTable from "./components/RequestsTable";
import SharingTab from "./components/SharingTab";
import { PrintRequest, errorMessage } from "./lib";

const TABS = [
    { id: "imprimer", label: "Imprimer", icon: Printer },
    { id: "partages", label: "Mes partages", icon: Share2 },
    { id: "historique", label: "Historique", icon: History },
] as const;

type TabId = (typeof TABS)[number]["id"];

function subscribeHash(onChange: () => void) {
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
}

function tabFromHash(): TabId {
    const id = window.location.hash.slice(1);
    return TABS.find((t) => t.id === id)?.id ?? "imprimer";
}

function HistoryTab() {
    const [requests, setRequests] = useState<PrintRequest[] | null>(null);
    useEffect(() => {
        fetchPrivate("/print/requests?limit=200").then(setRequests).catch((err) => {
            toast.error(errorMessage(err));
            setRequests([]);
        });
    }, []);
    if (!requests) return <p className="text-sm text-zinc-500">Chargement…</p>;
    return <RequestsTable requests={requests} show={["donor"]} empty="Vous n’avez encore rien imprimé avec un quota partagé." />;
}

export default function PrintPage() {
    // The active tab lives in the URL hash, so the account page can link to « Mes partages ».
    const tab = useSyncExternalStore(subscribeHash, tabFromHash, () => "imprimer" as TabId);
    const select = (id: TabId) => {
        window.history.replaceState(null, "", `#${id}`);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-print-500/30">
            <main className="mx-auto max-w-[1400px] space-y-8 px-4 py-10 md:px-8 md:py-14">
                <header className="space-y-3 border-b border-zinc-800/60 pb-6">
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-print-400">
                        <Printer className="h-4 w-4" aria-hidden /> Services
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-white md:text-5xl">Impressions</h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
                        Imprimez avec le quota followme qu’un membre vous partage, ou partagez le vôtre. Les pages sont décomptées
                        du compte du donneur, dans les limites qu’il a fixées.
                    </p>
                </header>

                <div role="tablist" aria-label="Sections" className="flex flex-wrap border-b border-zinc-800">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button key={id} role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`}
                            onClick={() => select(id)}
                            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-print-500/50 ${tab === id ? "border-print-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-200"}`}>
                            <Icon className="h-4 w-4" aria-hidden /> {label}
                        </button>
                    ))}
                </div>

                <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                    {tab === "imprimer" && <PrintTab />}
                    {tab === "partages" && <SharingTab />}
                    {tab === "historique" && <HistoryTab />}
                </div>
            </main>
        </div>
    );
}
