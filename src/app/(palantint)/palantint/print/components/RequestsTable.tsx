"use client";

import type { ReactNode } from "react";
import { PrintRequest, StatusBadge, costLabel, formatDate, panel, printerLabel } from "../lib";

type Column = "requester" | "donor";

export default function RequestsTable({
    requests, show, empty, actions,
}: {
    requests: PrintRequest[];
    show: Column[];
    empty: string;
    actions?: (request: PrintRequest) => ReactNode;
}) {
    if (requests.length === 0) {
        return <p className={`${panel} p-6 text-sm text-zinc-500`}>{empty}</p>;
    }
    return (
        <div className={`${panel} overflow-x-auto`}>
            <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    <tr>
                        <th className="px-4 py-3 font-normal">Date</th>
                        {show.includes("requester") && <th className="px-4 py-3 font-normal">Membre</th>}
                        {show.includes("donor") && <th className="px-4 py-3 font-normal">Quota de</th>}
                        <th className="px-4 py-3 font-normal">Document</th>
                        <th className="px-4 py-3 font-normal">Pages</th>
                        <th className="px-4 py-3 font-normal">Coût</th>
                        <th className="px-4 py-3 font-normal">Imprimante</th>
                        <th className="px-4 py-3 font-normal">État</th>
                        {actions && <th className="px-4 py-3 font-normal"><span className="sr-only">Actions</span></th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                    {requests.map((r) => (
                        <tr key={r.id} className="align-top hover:bg-zinc-900/40">
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-400">{formatDate(r.created_at)}</td>
                            {show.includes("requester") && <td className="px-4 py-3 font-mono text-xs text-zinc-200">{r.requester.username}</td>}
                            {show.includes("donor") && <td className="px-4 py-3 font-mono text-xs text-zinc-200">{r.donor.username}</td>}
                            <td className="max-w-[16rem] px-4 py-3">
                                <span className="block truncate text-zinc-200" title={r.original_filename}>{r.original_filename}</span>
                                {r.error && <span className="mt-1 block text-xs text-comms-400">{r.error}</span>}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-400">
                                {r.page_count} × {r.copies}{r.color ? " · coul." : ""}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-print-300">{costLabel(r)}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-400">{printerLabel(r.printer_name)}</td>
                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                            {actions && <td className="whitespace-nowrap px-4 py-3 text-right">{actions(r)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
