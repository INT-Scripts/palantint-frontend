"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchPrivate } from "@/lib/api";
import RequestsTable from "../../print/components/RequestsTable";
import {
    Grant, Member, OPEN_STATUSES, PrintRequest, PrintSettings, dangerButton, errorMessage, field, formatDate,
    ghostButton, panel,
} from "../../print/lib";

type DonorOverview = { donor: Member; settings: PrintSettings; active_grants: number };
type Stats = {
    sharing_donors: number;
    active_grants: number;
    requests_by_status: Record<string, number>;
    pages_printed: number;
    pages_reserved: number;
};

const STATUS_FILTERS: [string, string][] = [
    ["", "Toutes"], ["PENDING_APPROVAL", "À valider"], ["HELD", "Prêtes à libérer"], ["RELEASED", "Libérées"],
    ["RECONCILED", "Imprimées"], ["FAILED", "Échecs"], ["EXPIRED", "Expirées"], ["CANCELLED", "Annulées"],
];

export default function AdminPrintPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [donors, setDonors] = useState<DonorOverview[]>([]);
    const [grants, setGrants] = useState<Grant[]>([]);
    const [requests, setRequests] = useState<PrintRequest[]>([]);
    const [status, setStatus] = useState("");
    const [version, setVersion] = useState(0);
    const load = () => setVersion((v) => v + 1);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            fetchPrivate("/print/admin/stats"),
            fetchPrivate("/print/admin/donors"),
            fetchPrivate("/print/admin/grants"),
            fetchPrivate(`/print/admin/requests${status ? `?status=${status}` : ""}`),
        ]).then(([s, d, g, r]) => {
            if (cancelled) return;
            setStats(s);
            setDonors(d);
            setGrants(g);
            setRequests(r);
        }).catch((err) => toast.error(errorMessage(err)));
        return () => { cancelled = true; };
    }, [status, version]);

    const act = async (action: () => Promise<unknown>, success: string) => {
        try {
            await action();
            toast.success(success);
            load();
        } catch (err) {
            toast.error(errorMessage(err));
        }
    };

    const tiles: [string, number | undefined][] = [
        ["Donneurs actifs", stats?.sharing_donors],
        ["Autorisations actives", stats?.active_grants],
        ["Pages imprimées", stats?.pages_printed],
        ["Pages réservées", stats?.pages_reserved],
    ];

    return (
        <div className="space-y-10">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Link href="/palantint/admin" className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white">
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Administration
                    </Link>
                    <h1 className="flex items-center gap-3 text-3xl font-black uppercase tracking-tight text-white md:text-5xl">
                        <Printer className="h-8 w-8 text-print-400" aria-hidden /> Impressions
                    </h1>
                </div>
                <Button type="button" onClick={load} className={`h-10 ${ghostButton}`}>
                    <RefreshCw className="h-4 w-4" aria-hidden /> Actualiser
                </Button>
            </header>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {tiles.map(([title, value]) => (
                    <div key={title} className={`${panel} p-5`}>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{title}</p>
                        <p className="mt-2 font-mono text-3xl font-bold text-white">{value ?? "—"}</p>
                    </div>
                ))}
            </div>

            <section className="space-y-3" aria-labelledby="admin-donors">
                <h2 id="admin-donors" className="font-mono text-xs uppercase tracking-widest text-zinc-400">Donneurs</h2>
                {donors.length === 0 ? <p className={`${panel} p-6 text-sm text-zinc-500`}>Aucun partage configuré.</p> : (
                    <div className={`${panel} overflow-x-auto`}>
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                                <tr>
                                    {["Membre", "Partage", "Solde", "Utilisé", "Limites", "Autorisations", ""].map((h) => (
                                        <th key={h} className="px-4 py-3 font-normal">{h || <span className="sr-only">Actions</span>}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900 font-mono text-xs">
                                {donors.map(({ donor, settings, active_grants }) => (
                                    <tr key={donor.id} className="hover:bg-zinc-900/40">
                                        <td className="px-4 py-3 text-zinc-200">{donor.username}</td>
                                        <td className="px-4 py-3 text-zinc-400">
                                            {!settings.is_sharing ? "Désactivé" : settings.is_paused ? "Suspendu" : settings.pool_enabled ? "Ouvert à tous" : "Sur autorisation"}
                                            {settings.is_sharing && !settings.auto_approve && " · validation"}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-300">{settings.last_balance ?? "—"} p.</td>
                                        <td className="px-4 py-3 text-print-300">{settings.used_total} p.</td>
                                        <td className="px-4 py-3 text-zinc-400">
                                            total {settings.global_cap ?? "∞"} · pers. {settings.pool_per_person_cap ?? "∞"} · solde ≥ {settings.min_balance_floor}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-300">{active_grants}</td>
                                        <td className="px-4 py-3 text-right">
                                            {settings.is_sharing && (
                                                <Button type="button" size="sm" aria-pressed={settings.is_paused}
                                                    className={settings.is_paused ? ghostButton : dangerButton}
                                                    onClick={() => act(() => fetchPrivate(`/print/admin/donors/${donor.id}/pause`, {
                                                        method: "PUT", body: JSON.stringify({ is_paused: !settings.is_paused }),
                                                    }), settings.is_paused ? "Partage réactivé." : "Partage suspendu.")}>
                                                    {settings.is_paused ? "Réactiver" : "Suspendre"}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="space-y-3" aria-labelledby="admin-grants">
                <h2 id="admin-grants" className="font-mono text-xs uppercase tracking-widest text-zinc-400">Autorisations</h2>
                {grants.length === 0 ? <p className={`${panel} p-6 text-sm text-zinc-500`}>Aucune autorisation en cours.</p> : (
                    <div className={`${panel} overflow-x-auto`}>
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                                <tr>
                                    {["Donneur", "Bénéficiaire", "Utilisées / accordées", "Jusqu’au", ""].map((h) => (
                                        <th key={h} className="px-4 py-3 font-normal">{h || <span className="sr-only">Actions</span>}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900 font-mono text-xs">
                                {grants.map((g) => (
                                    <tr key={g.id} className="hover:bg-zinc-900/40">
                                        <td className="px-4 py-3 text-zinc-200">{g.donor.username}</td>
                                        <td className="px-4 py-3 text-zinc-200">{g.beneficiary.username}</td>
                                        <td className="px-4 py-3 text-print-300">{g.used} / {g.amount} p.</td>
                                        <td className="px-4 py-3 text-zinc-400">{g.expires_at ? formatDate(g.expires_at) : "Sans limite"}{!g.is_active && " (expirée)"}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button type="button" size="sm" className={dangerButton}
                                                onClick={() => window.confirm(`Retirer l’autorisation de ${g.beneficiary.username} sur le quota de ${g.donor.username} ?`)
                                                    && act(() => fetchPrivate(`/print/grants/${g.id}`, { method: "DELETE" }), "Autorisation retirée.")}>
                                                Retirer
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="space-y-3" aria-labelledby="admin-requests">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="admin-requests" className="font-mono text-xs uppercase tracking-widest text-zinc-400">Demandes</h2>
                    <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                        État
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${field} w-48 py-1.5 text-xs`}>
                            {STATUS_FILTERS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                        </select>
                    </label>
                </div>
                <RequestsTable requests={requests} show={["requester", "donor"]} empty="Aucune demande."
                    actions={(r) => OPEN_STATUSES.includes(r.status) && r.status !== "UPLOADING" ? (
                        <Button type="button" size="sm" className={dangerButton} aria-label={`Annuler ${r.original_filename}`}
                            onClick={() => act(() => fetchPrivate(`/print/requests/${r.id}/cancel`, { method: "POST" }), "Demande annulée.")}>
                            <X className="h-3.5 w-3.5" aria-hidden /> Annuler
                        </Button>
                    ) : null} />
            </section>
        </div>
    );
}
