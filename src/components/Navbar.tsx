"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogIn, LogOut, Search, MapPin, Share2, CalendarDays, Flame, WashingMachine, Printer, ChevronDown, Users, Layers, Building2, Shield } from "lucide-react";
import { fetchPrivate } from "@/lib/api";
import { campusHref } from "@/lib/campus";
import GlobalSearch from "./GlobalSearch";

export default function Navbar() {
    const pathname = usePathname();
    const [user, setUser] = useState<{ username: string; is_admin: boolean } | null>(null);
    const [open, setOpen] = useState<string | null>(null);
    const [mobile, setMobile] = useState(false);
    const root = useRef<HTMLElement>(null);
    useEffect(() => {
        const controller = new AbortController();
        if (localStorage.getItem("palantint_token")) fetchPrivate("/users/me", {signal: controller.signal}).then(setUser).catch(() => {});
        return () => controller.abort();
    }, []);
    useEffect(() => {
        const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(null); setMobile(false); } };
        const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(null); setMobile(false); } };
        document.addEventListener("pointerdown", outside);
        document.addEventListener("keydown", escape);
        return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
    }, []);
    const prefix = user ? "/palantint" : "";
    const groups = [
        {name: "Campus", items: [
            {href: `${prefix}/campus`, label: "Carte du campus", icon: MapPin},
            // Signed in, the Foyer and the flats are shown in the campus map panel.
            ...(user ? [{href: campusHref({building: "Foyer"}), label: "Foyer", icon: Layers}] : [
                {href: "/foyer", label: "Foyer", icon: Layers},
                {href: "/apartments", label: "Logements", icon: Building2},
            ]),
        ]},
        ...(user ? [{name: "Annuaire", items: [
            {href: "/palantint/students", label: "Personnes", icon: Search},
            {href: "/palantint/clubs", label: "Associations", icon: Users},
            {href: "/palantint/network", label: "Relations", icon: Share2},
        ]}] : []),
        {name: "Services", items: [
            {href: `${prefix}/laundry`, label: "Laveries", icon: WashingMachine},
            ...(user ? [
                {href: "/palantint/timetable", label: "Emplois du temps", icon: CalendarDays},
                {href: "/palantint/pay5vend", label: "Distributeurs", icon: Flame},
                {href: "/palantint/print", label: "Impressions", icon: Printer},
            ] : []),
        ]},
    ];
    const close = () => { setOpen(null); setMobile(false); };
    const logout = () => {
        for (const key of ["palantint_token", "palantint_refresh_token"]) {
            localStorage.removeItem(key);
            document.cookie = `${key}=; path=/; max-age=0`;
        }
        window.location.href = "/login";
    };
    return <header ref={root} className="fixed inset-x-0 top-0 z-[100] border-b border-zinc-800/80 bg-zinc-950/95 font-mono backdrop-blur-xl">
        <div className="flex h-[72px] items-center justify-between gap-3 px-4 sm:h-20 sm:gap-5 sm:px-6">
            <Link href={user ? "/palantint" : "/"} onClick={close} className="flex shrink-0 items-center gap-3 text-xl font-black uppercase tracking-tighter text-white"><Image src="/palantint.svg" alt="" width={28} height={28} className="brightness-0 invert" /><span>{user ? "PalantINT" : "INT Portal"}</span></Link>
            <GlobalSearch className="hidden min-w-0 flex-1 md:flex md:max-w-sm" inputClassName="w-full" placeholder="Rechercher…" />
            <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">{groups.map(group => <div key={group.name} className="relative">
                <button aria-expanded={open === group.name} aria-controls={`nav-${group.name}`} onClick={() => setOpen(open === group.name ? null : group.name)} className={`flex items-center gap-2 rounded-none border px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${open === group.name || group.items.some(item => pathname.startsWith(item.href)) ? "border-zinc-700 bg-zinc-900 text-white" : "border-transparent text-zinc-400 hover:border-zinc-800 hover:text-white"}`}>{group.name}<ChevronDown className={`h-3 w-3 text-zinc-600 transition-transform ${open === group.name ? "rotate-180" : ""}`} /></button>
                {open === group.name && <div id={`nav-${group.name}`} className="absolute right-0 top-full mt-3 w-56 rounded-none border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl">{group.items.map(({href, label, icon: Icon}) => <Link key={href} href={href} onClick={close} aria-current={pathname === href ? "page" : undefined} className={`flex items-center gap-3 rounded-none px-3 py-2.5 text-xs ${pathname === href ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</Link>)}</div>}
            </div>)}</nav>
            <div className="flex shrink-0 items-center gap-2">
                {user?.is_admin && <Link href="/palantint/admin" title="Administration" aria-label="Administration" onClick={close} className={`flex h-9 w-9 items-center justify-center border transition-colors ${pathname.startsWith("/palantint/admin") ? "border-campus-500/50 bg-campus-500/10 text-campus-400" : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-white"}`}><Shield className="h-4 w-4" /></Link>}
                {user ? <><Link href="/palantint/account" title="Mon compte" onClick={close} className="flex items-center gap-2 rounded-none border border-zinc-800 px-2.5 py-2 text-xs text-zinc-300 hover:border-zinc-600"><User className="h-4 w-4" /><span className="hidden max-w-28 truncate sm:block">{user.username}</span></Link><button title="Se déconnecter" aria-label="Se déconnecter" onClick={logout} className="hidden rounded-none p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white sm:block"><LogOut className="h-4 w-4" /></button></> : <Link href="/login" className="rounded-none border border-zinc-700 p-2 text-zinc-300"><LogIn className="h-4 w-4" /><span className="sr-only">Se connecter</span></Link>}
                <button aria-label={mobile ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={mobile} aria-controls="mobile-navigation" onClick={() => setMobile(!mobile)} className="rounded-none p-2 text-zinc-400 hover:text-white lg:hidden">{mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
            </div>
        </div>
        {mobile && <nav id="mobile-navigation" aria-label="Navigation mobile" className="max-h-[calc(100dvh-80px)] overflow-y-auto border-t border-zinc-800 bg-zinc-950 px-4 pb-5 lg:hidden"><GlobalSearch className="my-3 md:hidden" inputClassName="w-full" placeholder="Rechercher…" />{groups.map(group => <div key={group.name} className="border-b border-zinc-900 py-3"><p className="mb-1 px-2 text-[10px] uppercase tracking-wider text-zinc-600">{group.name}</p>{group.items.map(({href, label, icon: Icon}) => <Link key={href} href={href} onClick={close} className={`flex items-center gap-3 rounded-none px-2 py-2.5 text-sm ${pathname === href ? "bg-zinc-900 text-white" : "text-zinc-400"}`}><Icon className="h-4 w-4" />{label}</Link>)}</div>)}{user && <button onClick={logout} className="mt-4 flex items-center gap-3 p-2 text-sm text-zinc-500"><LogOut className="h-4 w-4" />Se déconnecter</button>}</nav>}
    </header>;
}
