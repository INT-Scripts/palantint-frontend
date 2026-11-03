import { Ban, CheckCircle2, Clock, Hourglass, Loader2, Printer, Send, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Member = { id: string; username: string };

export type PrintSettings = {
    is_sharing: boolean;
    is_paused: boolean;
    pool_enabled: boolean;
    auto_approve: boolean;
    global_cap: number | null;
    pool_per_person_cap: number | null;
    min_balance_floor: number;
    has_credentials: boolean;
    last_balance: number | null;
    balance_checked_at: string | null;
    used_total: number;
};

export type Grant = {
    id: string;
    donor: Member;
    beneficiary: Member;
    amount: number;
    used: number;
    remaining: number;
    expires_at: string | null;
    revoked_at: string | null;
    is_active: boolean;
    created_at: string;
};

export type Donor = {
    donor: Member;
    via: "GRANT" | "POOL";
    grant_id: string | null;
    grant_expires_at: string | null;
    remaining: number;
    auto_approve: boolean;
};

export type PrintRequest = {
    id: string;
    requester: Member;
    donor: Member;
    via: "GRANT" | "POOL";
    status: string;
    original_filename: string;
    page_count: number;
    page_range: string | null;
    copies: number;
    color: boolean;
    printer_name: string | null;
    estimated_cost: number;
    actual_cost: number | null;
    error: string | null;
    approval_expires_at: string | null;
    hold_expires_at: string | null;
    created_at: string;
    released_at: string | null;
};

export type PhysicalPrinter = { name: string; status: string; available: boolean };

export const OPEN_STATUSES = ["PENDING_APPROVAL", "APPROVED", "UPLOADING", "HELD"];
export const MAX_UPLOAD_MB = 50;

const STATUS: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
    PENDING_APPROVAL: { label: "À valider", icon: Hourglass, tone: "border-timetable-500/40 text-timetable-400" },
    APPROVED: { label: "Acceptée", icon: CheckCircle2, tone: "border-print-500/40 text-print-400" },
    UPLOADING: { label: "Envoi à followme", icon: Loader2, tone: "border-print-500/40 text-print-400" },
    HELD: { label: "Prêt à libérer", icon: Printer, tone: "border-print-500/60 text-print-300" },
    RELEASED: { label: "Libéré", icon: Send, tone: "border-zinc-600 text-zinc-300" },
    RECONCILED: { label: "Imprimé", icon: CheckCircle2, tone: "border-zinc-600 text-zinc-300" },
    CANCELLED: { label: "Annulée", icon: Ban, tone: "border-zinc-700 text-zinc-500" },
    REJECTED: { label: "Refusée", icon: XCircle, tone: "border-comms-500/40 text-comms-400" },
    EXPIRED: { label: "Expirée", icon: Clock, tone: "border-zinc-700 text-zinc-500" },
    FAILED: { label: "Échec", icon: XCircle, tone: "border-comms-500/40 text-comms-400" },
};

export function StatusBadge({ status }: { status: string }) {
    const info = STATUS[status] ?? { label: status, icon: Clock, tone: "border-zinc-700 text-zinc-400" };
    const Icon = info.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${info.tone}`}>
            <Icon className={`h-3 w-3 ${status === "UPLOADING" ? "animate-spin" : ""}`} aria-hidden />
            {info.label}
        </span>
    );
}

/** The API returns naive UTC datetimes. */
export function parseUtc(value: string | null): Date | null {
    if (!value) return null;
    return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
}

export function formatDate(value: string | null): string {
    const date = parseUtc(value);
    return date ? date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export function costLabel(request: PrintRequest): string {
    return request.actual_cost !== null ? `${request.actual_cost} p.` : `≤ ${request.estimated_cost} p.`;
}

export function printerLabel(name: string | null): string {
    return name ? name.replace(/^.*\\/, "") : "—";
}

export const panel = "border border-zinc-800/60 bg-zinc-900/30 rounded-none";
export const field = "w-full bg-zinc-950 border border-zinc-800 rounded-none px-3 py-2 text-sm font-mono text-white outline-none focus-visible:border-print-500/60 focus-visible:ring-1 focus-visible:ring-print-500/40 disabled:opacity-50";
export const label = "block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5";
export const primaryButton = "rounded-none border border-print-500/40 bg-print-500/10 font-mono text-[11px] uppercase tracking-widest text-print-300 hover:bg-print-500/20 hover:text-print-200 disabled:opacity-40";
export const ghostButton = "rounded-none border border-zinc-800 bg-transparent font-mono text-[11px] uppercase tracking-widest text-zinc-400 hover:bg-zinc-900 hover:text-white";
export const dangerButton = "rounded-none border border-comms-500/40 bg-comms-500/5 font-mono text-[11px] uppercase tracking-widest text-comms-400 hover:bg-comms-500/15";

/** Keeps the server's message (plain French) from a fetchPrivate error. */
export function errorMessage(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err);
    const status = Number(message.match(/failed with status (\d+)/)?.[1]);
    const detail = message.replace(/^fetchPrivate ".*?" failed with status \d+: /, "");
    // Proxy errors (502/503/504) come back as nginx HTML pages, not as API messages.
    if (/<html|<!doctype/i.test(detail) || [502, 503, 504].includes(status)) {
        return "Le serveur PalantINT ne répond pas. Réessayez dans quelques instants.";
    }
    return detail || "Une erreur est survenue.";
}
