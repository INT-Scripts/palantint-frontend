"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, KeyRound, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchPrivate } from "@/lib/api";
import {
    Grant, Member, OPEN_STATUSES, PrintRequest, PrintSettings, dangerButton, errorMessage, field, formatDate,
    ghostButton, label, panel, parseUtc, primaryButton,
} from "../lib";
import RequestsTable from "./RequestsTable";

type Toggle = "is_sharing" | "is_paused" | "pool_enabled" | "auto_approve";

const TOGGLES: { key: Toggle; title: string; help: string }[] = [
    { key: "is_sharing", title: "Partager mon quota", help: "Les membres autorisés impriment sur votre compte followme." },
    { key: "is_paused", title: "Suspendre le partage", help: "Bloque toute nouvelle impression sans retirer les autorisations." },
    { key: "pool_enabled", title: "Ouvrir à tous les membres", help: "Tout membre PalantINT peut utiliser votre quota, dans la limite par personne." },
    { key: "auto_approve", title: "Valider automatiquement", help: "Sinon, chaque demande attend votre accord (24 h au plus)." },
];

function toDateInput(value: string | null) {
    const date = parseUtc(value);
    return date ? date.toISOString().slice(0, 10) : "";
}

function fromDateInput(value: string) {
    return value ? new Date(`${value}T23:59:59`).toISOString() : null;
}

function without<T>(record: Record<string, T>, key: string) {
    const copy = { ...record };
    delete copy[key];
    return copy;
}

function optionalNumber(value: string) {
    return value === "" ? null : Math.max(0, Math.floor(Number(value)));
}

export default function SharingTab() {
    const [settings, setSettings] = useState<PrintSettings | null>(null);
    const [draft, setDraft] = useState<PrintSettings | null>(null);
    const [grants, setGrants] = useState<Grant[]>([]);
    const [donations, setDonations] = useState<PrintRequest[]>([]);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const [s, g, d] = await Promise.all([
                fetchPrivate("/print/settings"), fetchPrivate("/print/grants"), fetchPrivate("/print/donations"),
            ]);
            setSettings(s);
            setDraft((current) => current ?? s);
            setGrants(g);
            setDonations(d);
        } catch (err) {
            toast.error(errorMessage(err));
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (!settings || !draft) return <p className="text-sm text-zinc-500">Chargement…</p>;

    const dirty = JSON.stringify(settings) !== JSON.stringify(draft);
    const pending = donations.filter((d) => d.status === "PENDING_APPROVAL");

    const save = async () => {
        setSaving(true);
        try {
            const { is_sharing, is_paused, pool_enabled, auto_approve, global_cap, pool_per_person_cap, min_balance_floor } = draft;
            const saved = await fetchPrivate("/print/settings", {
                method: "PUT",
                body: JSON.stringify({ is_sharing, is_paused, pool_enabled, auto_approve, global_cap, pool_per_person_cap, min_balance_floor }),
            });
            setSettings(saved);
            setDraft(saved);
            toast.success("Réglages enregistrés.");
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const refreshBalance = async () => {
        setRefreshing(true);
        try {
            const updated = await fetchPrivate("/print/balance");
            setSettings(updated);
            setDraft((d) => d && { ...d, last_balance: updated.last_balance, balance_checked_at: updated.balance_checked_at });
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setRefreshing(false);
        }
    };

    const decide = async (request: PrintRequest, action: "approve" | "reject") => {
        try {
            await fetchPrivate(`/print/requests/${request.id}/${action}`, { method: "POST" });
            toast.success(action === "approve" ? "Demande acceptée et envoyée à followme." : "Demande refusée.");
            load();
        } catch (err) {
            toast.error(errorMessage(err));
            load();
        }
    };

    const cancel = async (request: PrintRequest) => {
        try {
            await fetchPrivate(`/print/requests/${request.id}/cancel`, { method: "POST" });
            toast.success("Impression annulée.");
            load();
        } catch (err) {
            toast.error(errorMessage(err));
        }
    };

    return (
        <div className="space-y-10">
            {!settings.has_credentials && (
                <div className="flex flex-wrap items-center justify-between gap-4 border border-timetable-500/30 bg-timetable-500/5 p-4">
                    <p className="flex items-center gap-3 text-sm text-zinc-300">
                        <KeyRound className="h-4 w-4 shrink-0 text-timetable-400" aria-hidden />
                        Le partage utilise vos identifiants CAS enregistrés, qui servent aussi à vous connecter à followme.
                    </p>
                    <Link href="/palantint/account" className={`inline-flex h-9 items-center px-4 ${ghostButton}`}>Enregistrer mes identifiants</Link>
                </div>
            )}

            <section className="grid gap-6 lg:grid-cols-3" aria-labelledby="share-settings">
                <div className={`${panel} space-y-5 p-6 lg:col-span-2`}>
                    <h2 id="share-settings" className="font-mono text-xs uppercase tracking-widest text-zinc-400">Réglages du partage</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {TOGGLES.map(({ key, title, help }) => (
                            <button key={key} type="button" aria-pressed={draft[key]}
                                disabled={key !== "is_sharing" && !draft.is_sharing}
                                onClick={() => setDraft({ ...draft, [key]: !draft[key] })}
                                className={`flex items-start gap-3 border p-3 text-left transition-colors disabled:opacity-40 ${draft[key] ? "border-print-500/50 bg-print-500/5" : "border-zinc-800 hover:border-zinc-600"}`}>
                                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${draft[key] ? "border-print-400 bg-print-500 text-zinc-950" : "border-zinc-600"}`}>
                                    {draft[key] && <Check className="h-3 w-3" aria-hidden />}
                                </span>
                                <span>
                                    <span className="block font-mono text-xs uppercase tracking-wider text-white">{title}</span>
                                    <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{help}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label htmlFor="global-cap" className={label}>Plafond total</label>
                            <input id="global-cap" type="number" min={0} placeholder="Illimité" value={draft.global_cap ?? ""}
                                onChange={(e) => setDraft({ ...draft, global_cap: optionalNumber(e.target.value) })} className={field} />
                        </div>
                        <div>
                            <label htmlFor="pool-cap" className={label}>Limite par personne</label>
                            <input id="pool-cap" type="number" min={0} placeholder="Illimitée" value={draft.pool_per_person_cap ?? ""}
                                disabled={!draft.pool_enabled}
                                onChange={(e) => setDraft({ ...draft, pool_per_person_cap: optionalNumber(e.target.value) })} className={field} />
                        </div>
                        <div>
                            <label htmlFor="floor" className={label}>Solde à conserver</label>
                            <input id="floor" type="number" min={0} value={draft.min_balance_floor}
                                onChange={(e) => setDraft({ ...draft, min_balance_floor: optionalNumber(e.target.value) ?? 0 })} className={field} />
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500">Toutes les valeurs sont en pages followme. Une impression doit respecter chacune d’elles.</p>
                    <div className="flex gap-2">
                        <Button type="button" onClick={save} disabled={!dirty || saving} className={`h-10 ${primaryButton}`}>Enregistrer</Button>
                        {dirty && <Button type="button" onClick={() => setDraft(settings)} className={`h-10 ${ghostButton}`}>Annuler les modifications</Button>}
                    </div>
                </div>

                <div className={`${panel} flex flex-col justify-between gap-6 p-6`}>
                    <div>
                        <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-400">Solde followme</h2>
                        <p className="mt-3 font-mono text-4xl font-bold text-white">
                            {settings.last_balance ?? "—"}<span className="ml-2 text-sm text-zinc-500">pages</span>
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                            {settings.balance_checked_at ? `Relevé le ${formatDate(settings.balance_checked_at)}` : "Jamais relevé"}
                        </p>
                    </div>
                    <dl className="space-y-1 font-mono text-xs">
                        <div className="flex justify-between"><dt className="text-zinc-500">Utilisé par d’autres</dt><dd className="text-print-300">{settings.used_total} p.</dd></div>
                        <div className="flex justify-between"><dt className="text-zinc-500">Autorisations actives</dt><dd className="text-zinc-200">{grants.filter((g) => g.is_active).length}</dd></div>
                    </dl>
                    <Button type="button" onClick={refreshBalance} disabled={refreshing || !settings.has_credentials} className={`h-10 ${ghostButton}`}>
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden /> Relever le solde
                    </Button>
                </div>
            </section>

            {pending.length > 0 && (
                <section className="space-y-3" aria-labelledby="pending-approvals">
                    <h2 id="pending-approvals" className="font-mono text-xs uppercase tracking-widest text-timetable-400">À valider ({pending.length})</h2>
                    <RequestsTable requests={pending} show={["requester"]} empty="" actions={(r) => (
                        <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" onClick={() => decide(r, "approve")} className={primaryButton}>Accepter</Button>
                            <Button type="button" size="sm" onClick={() => decide(r, "reject")} className={dangerButton}>Refuser</Button>
                        </div>
                    )} />
                </section>
            )}

            <GrantsSection grants={grants} onChange={load} />

            <section className="space-y-3" aria-labelledby="donations-history">
                <h2 id="donations-history" className="font-mono text-xs uppercase tracking-widest text-zinc-400">Impressions sur mon compte</h2>
                <RequestsTable requests={donations} show={["requester"]} empty="Personne n’a encore imprimé avec votre quota."
                    actions={(r) => OPEN_STATUSES.includes(r.status) && r.status !== "UPLOADING" ? (
                        <Button type="button" size="sm" onClick={() => cancel(r)} className={dangerButton} aria-label={`Annuler ${r.original_filename}`}>
                            <X className="h-3.5 w-3.5" aria-hidden /> Annuler
                        </Button>
                    ) : null} />
            </section>
        </div>
    );
}

function GrantsSection({ grants, onChange }: { grants: Grant[]; onChange: () => void }) {
    const [query, setQuery] = useState("");
    const [matches, setMatches] = useState<Member[]>([]);
    const [amount, setAmount] = useState(20);
    const [expires, setExpires] = useState("");
    const [editing, setEditing] = useState<Record<string, { amount: number; expires: string }>>({});

    useEffect(() => {
        const q = query.trim();
        if (!q) return;
        const timer = setTimeout(() => {
            fetchPrivate(`/print/members?q=${encodeURIComponent(q)}`).then(setMatches).catch(() => setMatches([]));
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    const call = async (action: () => Promise<unknown>, success: string) => {
        try {
            await action();
            toast.success(success);
            onChange();
        } catch (err) {
            toast.error(errorMessage(err));
        }
    };

    const create = (e: React.FormEvent) => {
        e.preventDefault();
        call(() => fetchPrivate("/print/grants", {
            method: "POST",
            body: JSON.stringify({ beneficiary_username: query.trim(), amount, expires_at: fromDateInput(expires) }),
        }).then(() => { setQuery(""); setExpires(""); }), `${amount} page(s) accordée(s) à ${query.trim()}.`);
    };

    const save = (grant: Grant) => {
        const edit = editing[grant.id];
        call(() => fetchPrivate(`/print/grants/${grant.id}`, {
            method: "PATCH", body: JSON.stringify({ amount: edit.amount, expires_at: fromDateInput(edit.expires) }),
        }).then(() => setEditing((current) => without(current, grant.id))), "Autorisation modifiée.");
    };

    const revoke = (grant: Grant) => {
        if (!window.confirm(`Retirer les pages accordées à ${grant.beneficiary.username} ? Ses documents en attente seront annulés.`)) return;
        call(() => fetchPrivate(`/print/grants/${grant.id}`, { method: "DELETE" }), "Autorisation retirée.");
    };

    return (
        <section className="space-y-3" aria-labelledby="grants">
            <h2 id="grants" className="font-mono text-xs uppercase tracking-widest text-zinc-400">Pages accordées</h2>
            <form onSubmit={create} className={`${panel} grid gap-4 p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end`}>
                <div className="relative">
                    <label htmlFor="grant-member" className={label}>Membre PalantINT</label>
                    <input id="grant-member" type="text" autoComplete="off" required value={query} placeholder="Identifiant"
                        onChange={(e) => setQuery(e.target.value)} className={field} list="grant-member-options" />
                    <datalist id="grant-member-options">
                        {query.trim() && matches.map((m) => <option key={m.id} value={m.username} />)}
                    </datalist>
                </div>
                <div>
                    <label htmlFor="grant-amount" className={label}>Pages</label>
                    <input id="grant-amount" type="number" min={1} required value={amount}
                        onChange={(e) => setAmount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className={field} />
                </div>
                <div>
                    <label htmlFor="grant-expires" className={label}>Jusqu’au (facultatif)</label>
                    <input id="grant-expires" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={field} />
                </div>
                <Button type="submit" className={`h-[38px] ${primaryButton}`}><Plus className="h-4 w-4" aria-hidden /> Accorder</Button>
            </form>

            {grants.length === 0 ? (
                <p className={`${panel} p-6 text-sm text-zinc-500`}>Vous n’avez accordé de pages à personne.</p>
            ) : (
                <div className={`${panel} overflow-x-auto`}>
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                            <tr>
                                <th className="px-4 py-3 font-normal">Membre</th>
                                <th className="px-4 py-3 font-normal">Utilisées</th>
                                <th className="px-4 py-3 font-normal">Accordées</th>
                                <th className="px-4 py-3 font-normal">Jusqu’au</th>
                                <th className="px-4 py-3 font-normal"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {grants.map((g) => {
                                const edit = editing[g.id];
                                return (
                                    <tr key={g.id} className="hover:bg-zinc-900/40">
                                        <td className="px-4 py-3 font-mono text-xs text-zinc-200">
                                            {g.beneficiary.username}
                                            {!g.is_active && <span className="ml-2 text-[10px] uppercase text-zinc-500">(expirée)</span>}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-print-300">{g.used} p. <span className="text-zinc-500">· reste {g.remaining}</span></td>
                                        <td className="px-4 py-3">
                                            {edit ? (
                                                <input type="number" min={1} aria-label={`Pages accordées à ${g.beneficiary.username}`} value={edit.amount}
                                                    onChange={(e) => setEditing({ ...editing, [g.id]: { ...edit, amount: Math.max(1, Math.floor(Number(e.target.value) || 1)) } })}
                                                    className={`${field} w-24`} />
                                            ) : <span className="font-mono text-xs text-zinc-200">{g.amount} p.</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {edit ? (
                                                <input type="date" aria-label={`Date de fin pour ${g.beneficiary.username}`} value={edit.expires}
                                                    onChange={(e) => setEditing({ ...editing, [g.id]: { ...edit, expires: e.target.value } })}
                                                    className={`${field} w-40`} />
                                            ) : <span className="font-mono text-xs text-zinc-400">{g.expires_at ? formatDate(g.expires_at) : "Sans limite"}</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                {edit ? (
                                                    <>
                                                        <Button type="button" size="sm" onClick={() => save(g)} className={primaryButton}>Enregistrer</Button>
                                                        <Button type="button" size="sm" onClick={() => setEditing((current) => without(current, g.id))} className={ghostButton}>Annuler</Button>
                                                    </>
                                                ) : (
                                                    <Button type="button" size="sm" className={ghostButton}
                                                        onClick={() => setEditing({ ...editing, [g.id]: { amount: g.amount, expires: toDateInput(g.expires_at) } })}>
                                                        Modifier
                                                    </Button>
                                                )}
                                                <Button type="button" size="sm" onClick={() => revoke(g)} className={dangerButton}>Retirer</Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
