"use client";

import { useEffect, useState } from "react";
import { Clock, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchPrivate } from "@/lib/api";
import {
    PhysicalPrinter, PrintRequest, StatusBadge, costLabel, dangerButton, errorMessage, ghostButton, panel,
    parseUtc, primaryButton, printerLabel,
} from "../lib";

function useCountdown(deadline: string | null) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!deadline) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [deadline]);
    const end = parseUtc(deadline)?.getTime();
    if (!end) return null;
    const left = Math.max(0, Math.floor((end - now) / 1000));
    return { left, text: `${Math.floor(left / 60)} min ${String(left % 60).padStart(2, "0")} s` };
}

export default function RequestCard({ request, onChange }: { request: PrintRequest; onChange: () => void }) {
    const [printers, setPrinters] = useState<PhysicalPrinter[] | null>(null);
    const [printer, setPrinter] = useState("");
    const [busy, setBusy] = useState(false);
    const countdown = useCountdown(request.status === "HELD" ? request.hold_expires_at : null);

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        try {
            await action();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const loadPrinters = () => run(async () => {
        const list: PhysicalPrinter[] = await fetchPrivate(`/print/requests/${request.id}/printers`);
        setPrinters(list);
        setPrinter(list.find((p) => p.available)?.name ?? "");
    });

    const release = () => run(async () => {
        await fetchPrivate(`/print/requests/${request.id}/release`, {
            method: "POST", body: JSON.stringify({ printer_name: printer }),
        });
        toast.success(`Document libéré sur ${printerLabel(printer)}.`);
        onChange();
    });

    const cancel = () => run(async () => {
        await fetchPrivate(`/print/requests/${request.id}/cancel`, { method: "POST" });
        toast.success("Impression annulée.");
        onChange();
    });

    return (
        <article className={`${panel} space-y-4 p-5`} aria-label={request.original_filename}>
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate font-mono text-sm text-white">{request.original_filename}</h3>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                        Quota de {request.donor.username} · {request.page_count} p. × {request.copies}
                        {request.color ? " · couleur" : " · noir et blanc"} · {costLabel(request)}
                    </p>
                </div>
                <StatusBadge status={request.status} />
            </header>

            {request.status === "PENDING_APPROVAL" && (
                <p className="text-sm text-zinc-400">En attente de la validation de {request.donor.username}.</p>
            )}

            {request.status === "HELD" && (
                <div className="space-y-3">
                    {countdown && (
                        <p className={`flex items-center gap-2 font-mono text-xs ${countdown.left < 600 ? "text-timetable-400" : "text-zinc-400"}`}>
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            Annulation automatique dans {countdown.text}
                        </p>
                    )}
                    {printers === null ? (
                        <Button type="button" onClick={loadPrinters} disabled={busy} className={`h-10 ${primaryButton}`}>
                            Choisir une imprimante
                        </Button>
                    ) : (
                        <fieldset className="space-y-2">
                            <legend className="sr-only">Imprimante</legend>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {printers.map((p) => (
                                    <label key={p.name}
                                        className={`flex items-center justify-between gap-2 border px-3 py-2 font-mono text-xs ${!p.available ? "cursor-not-allowed border-zinc-900 text-zinc-600" : printer === p.name ? "cursor-pointer border-print-500/60 bg-print-500/5 text-white" : "cursor-pointer border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
                                        <span className="flex items-center gap-2">
                                            <input type="radio" name={`printer-${request.id}`} value={p.name} disabled={!p.available}
                                                checked={printer === p.name} onChange={() => setPrinter(p.name)} className="accent-lime-500" />
                                            {printerLabel(p.name)}
                                        </span>
                                        <span className="text-[10px] uppercase">{p.available ? "Disponible" : "Indisponible"}</span>
                                    </label>
                                ))}
                            </div>
                            {printers.length === 0 && <p className="text-sm text-zinc-500">Aucune imprimante n’est proposée par followme.</p>}
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" onClick={release} disabled={busy || !printer} className={`h-10 ${primaryButton}`}>
                                    <Send className="h-4 w-4" aria-hidden /> Libérer
                                </Button>
                                <Button type="button" onClick={loadPrinters} disabled={busy} className={`h-10 ${ghostButton}`}>
                                    Actualiser les imprimantes
                                </Button>
                            </div>
                        </fieldset>
                    )}
                </div>
            )}

            {["PENDING_APPROVAL", "APPROVED", "HELD"].includes(request.status) && (
                <Button type="button" onClick={cancel} disabled={busy} className={`h-9 ${dangerButton}`}>
                    <X className="h-4 w-4" aria-hidden /> Annuler
                </Button>
            )}
        </article>
    );
}
