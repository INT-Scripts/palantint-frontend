"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUp, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchPrivate } from "@/lib/api";
import {
    Donor, MAX_UPLOAD_MB, OPEN_STATUSES, PrintRequest, errorMessage, field, label, panel, primaryButton,
} from "../lib";
import RequestCard from "./RequestCard";

function donorKey(d: Donor) {
    return `${d.donor.id}:${d.via}`;
}

export default function PrintTab() {
    const [donors, setDonors] = useState<Donor[] | null>(null);
    const [requests, setRequests] = useState<PrintRequest[]>([]);
    const [selected, setSelected] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [copies, setCopies] = useState(1);
    const [color, setColor] = useState(false);
    const [pageRange, setPageRange] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [fileKey, setFileKey] = useState(0); // remounts the file input to clear it

    const load = useCallback(async () => {
        try {
            const [donorList, mine] = await Promise.all([fetchPrivate("/print/donors"), fetchPrivate("/print/requests?limit=50")]);
            setDonors(donorList);
            setRequests(mine.filter((r: PrintRequest) => OPEN_STATUSES.includes(r.status)));
            setSelected((current) => current || (donorList[0] ? donorKey(donorList[0]) : ""));
        } catch (err) {
            toast.error(errorMessage(err));
            setDonors([]);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, 20000);
        return () => clearInterval(timer);
    }, [load]);

    const donor = donors?.find((d) => donorKey(d) === selected);
    const rate = color ? 8 : 1;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!donor || !file) return;
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
            toast.error(`Le fichier dépasse ${MAX_UPLOAD_MB} Mo.`);
            return;
        }
        const body = new FormData();
        body.append("file", file);
        body.append("donor_id", donor.donor.id);
        body.append("via", donor.via);
        body.append("copies", String(copies));
        body.append("color", String(color));
        if (pageRange.trim()) body.append("page_range", pageRange.trim());
        setSubmitting(true);
        try {
            const created: PrintRequest = await fetchPrivate("/print/requests", { method: "POST", body });
            toast.success(created.status === "HELD"
                ? "Document prêt : choisissez une imprimante pour le libérer."
                : `Demande envoyée à ${donor.donor.username} pour validation.`);
            setFile(null);
            setPageRange("");
            setFileKey((k) => k + 1);
            load();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="grid gap-8 lg:grid-cols-5">
            <form onSubmit={submit} className={`${panel} space-y-6 p-6 lg:col-span-2`} aria-label="Nouvelle impression">
                <fieldset className="space-y-2">
                    <legend className={label}>Quota utilisé</legend>
                    {donors === null && <p className="text-sm text-zinc-500">Chargement…</p>}
                    {donors?.length === 0 && (
                        <p className="text-sm leading-relaxed text-zinc-400">
                            Personne ne partage de quota avec vous pour le moment. Un membre peut vous accorder des pages depuis
                            l’onglet « Mes partages ».
                        </p>
                    )}
                    {donors?.map((d) => {
                        const key = donorKey(d);
                        const active = key === selected;
                        return (
                            <label key={key}
                                className={`flex cursor-pointer items-center justify-between gap-3 border px-3 py-2.5 transition-colors ${active ? "border-print-500/60 bg-print-500/5" : "border-zinc-800 hover:border-zinc-600"}`}>
                                <span className="flex items-center gap-3">
                                    <input type="radio" name="donor" value={key} checked={active} onChange={() => setSelected(key)}
                                        className="accent-lime-500" />
                                    <span>
                                        <span className="block font-mono text-sm text-white">{d.donor.username}</span>
                                        <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                                            {d.via === "GRANT" ? "Pages accordées" : "Partage ouvert"}
                                            {!d.auto_approve && " · validation par le donneur"}
                                        </span>
                                    </span>
                                </span>
                                <span className="text-right font-mono text-sm text-print-300">
                                    {d.remaining}<span className="ml-1 text-[10px] text-zinc-500">p.</span>
                                </span>
                            </label>
                        );
                    })}
                </fieldset>

                <div>
                    <label htmlFor="print-file" className={label}>Document PDF (max. {MAX_UPLOAD_MB} Mo)</label>
                    <label htmlFor="print-file"
                        className="flex cursor-pointer items-center gap-3 border border-dashed border-zinc-700 px-3 py-4 text-sm text-zinc-400 hover:border-print-500/50 hover:text-zinc-200 focus-within:border-print-500/60">
                        <FileUp className="h-4 w-4 shrink-0 text-print-400" aria-hidden />
                        <span className="truncate font-mono">{file ? file.name : "Choisir un fichier"}</span>
                        <input key={fileKey} id="print-file" type="file" accept="application/pdf,.pdf" className="sr-only"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="print-copies" className={label}>Copies</label>
                        <input id="print-copies" type="number" min={1} max={99} value={copies}
                            onChange={(e) => setCopies(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} className={field} />
                    </div>
                    <div>
                        <label htmlFor="print-range" className={label}>Pages</label>
                        <input id="print-range" type="text" placeholder="Toutes (ex. 1-3,5)" value={pageRange}
                            onChange={(e) => setPageRange(e.target.value)} className={field} />
                    </div>
                </div>

                <div>
                    <span className={label} id="print-mode">Mode</span>
                    <div className="grid grid-cols-2" role="group" aria-labelledby="print-mode">
                        {[false, true].map((value) => (
                            <button key={String(value)} type="button" aria-pressed={color === value} onClick={() => setColor(value)}
                                className={`border px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${color === value ? "border-print-500/60 bg-print-500/10 text-print-300" : "border-zinc-800 text-zinc-500 hover:text-zinc-200"}`}>
                                {value ? "Couleur" : "Noir et blanc"}
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                        {color
                            ? "Jusqu’à 8 pages de quota par page imprimée. Le coût réel, calculé par followme selon les pages en couleur, est ajusté après l’impression."
                            : "1 page de quota par page imprimée."}
                        {" "}Coût réservé : pages × {copies} copie{copies > 1 ? "s" : ""} × {rate}. Le recto-verso se règle sur l’imprimante.
                    </p>
                </div>

                <Button type="submit" disabled={!donor || !file || submitting} className={`h-11 w-full ${primaryButton}`}>
                    <Printer className="h-4 w-4" aria-hidden /> {submitting ? "Envoi à followme…" : "Envoyer le document"}
                </Button>
            </form>

            <section className="space-y-4 lg:col-span-3" aria-labelledby="open-requests">
                <div className="flex items-center justify-between">
                    <h2 id="open-requests" className="font-mono text-xs uppercase tracking-widest text-zinc-400">Documents en cours</h2>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={load} aria-label="Actualiser" title="Actualiser">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
                {requests.length === 0 && (
                    <p className={`${panel} p-6 text-sm text-zinc-500`}>
                        Aucun document en attente. Une fois envoyé, le document reste une heure dans la file followme du donneur,
                        le temps de choisir une imprimante.
                    </p>
                )}
                {requests.map((request) => <RequestCard key={request.id} request={request} onChange={load} />)}
            </section>
        </div>
    );
}
