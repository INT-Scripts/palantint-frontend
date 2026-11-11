"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return <section className="border-t border-zinc-800/80 px-5 py-4">
        <div className="mb-2 flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{title}</h3>
            {action}
        </div>
        {children}
    </section>;
}

/** One entry of the labelled action row: a square icon and a short label; `active` marks the action whose result is shown. */
export function Action({ href, onClick, icon: Icon, label, tone, active = false, busy = false }: { href?: string; onClick?: () => void; icon: ComponentType<{ className?: string }>; label: string; tone: string; active?: boolean; busy?: boolean }) {
    const body = <><span className={`flex h-10 w-10 items-center justify-center border ${active ? "border-campus-500/60 bg-campus-500/15" : "border-zinc-800"} ${tone} ${busy ? "animate-pulse" : ""}`}><Icon className="h-4 w-4" /></span><span className="w-16 text-center text-[10px] leading-tight text-zinc-400">{label}</span></>;
    const style = "flex shrink-0 flex-col items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campus-400";
    return href ? <Link href={href} title={label} className={style}>{body}</Link> : <button onClick={onClick} title={label} aria-pressed={active} className={style}>{body}</button>;
}
