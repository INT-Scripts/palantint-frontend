"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, Check, Copy, FileText, Layers, Loader2, MapPin, Users, WashingMachine, X } from "lucide-react";
import BuildingOutline from "@/components/palantint/BuildingOutline";
import { floorName, type CampusBuilding as Building, type Place } from "@/lib/campus";
import { timetableHref } from "@/lib/timetableContext";

export type PlaceContext = {
    code: string;
    kind: string;
    occupants: { id: string; first_name: string; last_name: string }[];
    clubs: { id: string; name: string }[];
    events: { id: string; name: string; start_time: string; end_time: string }[];
    agenda_room: string | null;
};
export type DrawnRoom = { plan?: { building: string; floor: string; room: string }; clubs?: { id: string; name: string }[] };

const levelLabel = (value: number) => value === 0 ? "RDC" : String(value);
const naturalOrder = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
const eventDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const eventTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function Section({ title, children }: { title: string; children: ReactNode }) {
    return <section className="border-t border-zinc-800/80 px-5 py-4">
        <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{title}</h3>
        {children}
    </section>;
}

function Action({ href, onClick, icon: Icon, label, tone }: { href?: string; onClick?: () => void; icon: ComponentType<{ className?: string }>; label: string; tone: string }) {
    const body = <><span className={`flex h-10 w-10 items-center justify-center border border-zinc-800 ${tone}`}><Icon className="h-4 w-4" /></span><span className="w-16 text-center text-[10px] leading-tight text-zinc-400">{label}</span></>;
    const style = "flex flex-col items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campus-400";
    return href ? <Link href={href} title={label} className={style}>{body}</Link> : <button onClick={onClick} title={label} className={style}>{body}</button>;
}

function ResidenceLinks({ building }: { building: Building }) {
    if (!building.residences?.length) return null;
    return <div className="flex flex-wrap gap-2">{building.residences.map(residence => <div key={residence.code} className="flex border border-zinc-800">
        <Link title={`Logements ${residence.code}`} href={`/palantint/apartments?bldg=${residence.code}`} className="flex items-center gap-2 px-3 py-2 text-xs text-housing-400 hover:bg-zinc-900"><Building2 className="h-4 w-4" />{residence.code}</Link>
        {residence.laundry && <Link title={`Laverie ${residence.code}`} aria-label={`Laverie ${residence.code}`} href={`/palantint/laundry?building=${residence.code}`} className="border-l border-zinc-800 p-2 text-media-400 hover:bg-zinc-900"><WashingMachine className="h-4 w-4" /></Link>}
    </div>)}</div>;
}

export default function CampusPanel({ building, buildingFeature, level, rooms, selected, context, loadingContext, drawnRoom, copied, onSelect, onCloseBuilding, onClosePlace, onCopy }: {
    building?: Building;
    buildingFeature?: Place;
    level: number;
    rooms: Place[];
    selected?: Place;
    context: PlaceContext | null;
    loadingContext: boolean;
    drawnRoom: DrawnRoom | null;
    copied: boolean;
    onSelect: (feature: Place) => void;
    onCloseBuilding: () => void;
    onClosePlace: () => void;
    onCopy: () => void;
}) {
    const place = selected && selected.properties.kind !== "building" ? selected : undefined;
    const p = place?.properties;
    const clubs = context?.clubs.length ? context.clubs : drawnRoom?.clubs || [];
    const planHref = drawnRoom?.plan ? `/palantint/${drawnRoom.plan.building === "Foyer" ? "foyer" : "apartments"}?${new URLSearchParams({ bldg: drawnRoom.plan.building, floor: drawnRoom.plan.floor, room: drawnRoom.plan.room })}` : null;
    const isFoyer = /foyer/i.test(building?.name || "");
    const residences = building?.residences || [];

    return <aside aria-label={place ? "Lieu sélectionné" : "Bâtiment sélectionné"} className="flex h-full flex-col overflow-hidden border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-xl sm:border-r">
        <header className="flex items-start gap-3 px-5 pb-4 pt-5">
            {place ? <button onClick={onClosePlace} title={building ? `Retour à ${building.name}` : "Fermer"} aria-label={building ? `Retour à ${building.name}` : "Fermer le lieu"} className="mt-0.5 p-1 text-zinc-500 hover:text-white"><ArrowLeft className="h-4 w-4" /></button>
                : <span className="text-campus-400"><BuildingOutline feature={buildingFeature} className="h-12 w-12" /></span>}
            <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-white">{place ? p!.name : building?.name}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-zinc-500">
                    {place ? <><Layers className="h-3 w-3" />{p!.levels.map(value => floorName(value)).join(" · ") || "Tous niveaux"}{building && <span>· {building.name}</span>}</>
                        : building && <>{building.levels.length} niveau{building.levels.length > 1 ? "x" : ""} · {floorName(level)}</>}
                </p>
            </div>
            <button onClick={onCloseBuilding} title="Quitter le bâtiment" aria-label="Quitter le bâtiment" className="p-1 text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
            {building && !!residences.length && <div className="px-5 pb-4"><ResidenceLinks building={building} /></div>}
            {place ? <>
                <div className="flex flex-wrap gap-4 border-t border-zinc-800/80 px-5 py-4">
                    {context?.agenda_room && <Action href={timetableHref({ room: context.agenda_room, week: new Date() })} icon={CalendarDays} label="Agenda" tone="text-timetable-400" />}
                    {planHref && <Action href={planHref} icon={FileText} label="Plan détaillé" tone="text-housing-400" />}
                    {!planHref && residences.map(residence => <Action key={residence.code} href={`/palantint/apartments?bldg=${residence.code}${context?.kind === "APARTMENT" ? `&room=${encodeURIComponent(context.code)}` : ""}`} icon={Building2} label={`Logements ${residence.code}`} tone="text-housing-400" />)}
                    {isFoyer && <Action href="/palantint/foyer" icon={Users} label="Foyer" tone="text-orga-400" />}
                    {(context?.occupants.length || 0) > 1 && <Action href={timetableHref({ students: context!.occupants.map(person => person.id), week: new Date() })} icon={Users} label="Disponibilités" tone="text-timetable-400" />}
                    <Action onClick={onCopy} icon={copied ? Check : Copy} label={copied ? "Lien copié" : "Copier le lien"} tone={copied ? "text-emerald-400" : "text-zinc-300"} />
                    {loadingContext && <Loader2 className="m-3 h-4 w-4 animate-spin text-zinc-500" />}
                </div>
                {(!!context?.occupants.length || !!clubs.length) && <Section title="Occupants et associations">
                    <div className="space-y-1">
                        {context?.occupants.map(person => <Link key={person.id} href={`/palantint/students/${person.id}`} className="flex items-center gap-2 p-2 text-sm text-student-400 hover:bg-zinc-900"><Users className="h-3.5 w-3.5" />{person.first_name} {person.last_name}</Link>)}
                        {clubs.map(club => <Link key={club.id} href={`/palantint/clubs?club=${encodeURIComponent(club.id)}`} className="flex items-center gap-2 p-2 text-sm text-orga-400 hover:bg-zinc-900"><Users className="h-3.5 w-3.5" />{club.name}</Link>)}
                    </div>
                </Section>}
                {!!context?.events.length && <Section title="Prochains événements">
                    <ul className="space-y-1">{context.events.slice(0, 8).map(event => <li key={event.id}><Link href={timetableHref({ room: context.agenda_room, week: new Date(event.start_time) })} className="flex items-baseline gap-3 p-2 text-sm hover:bg-zinc-900">
                        <span className="w-24 shrink-0 font-mono text-[11px] text-zinc-500">{eventDay.format(new Date(event.start_time))}<br />{eventTime.format(new Date(event.start_time))}–{eventTime.format(new Date(event.end_time))}</span>
                        <span className="text-zinc-200">{event.name}</span>
                    </Link></li>)}</ul>
                </Section>}
                <Section title="Informations">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        {building && <><dt className="text-zinc-500">Bâtiment</dt><dd className="text-zinc-200">{building.name}</dd></>}
                        <dt className="text-zinc-500">Niveau</dt><dd className="text-zinc-200">{p!.levels.map(levelLabel).join(" · ") || "—"}</dd>
                        {!!p!.geometry_area_m2 && <><dt className="text-zinc-500">Surface</dt><dd className="text-zinc-200">≈ {Math.round(p!.geometry_area_m2)} m²</dd></>}
                        {!!p!.tag_names?.length && <><dt className="text-zinc-500">Catégories</dt><dd className="text-zinc-200">{p!.tag_names.join(" · ")}</dd></>}
                        {p!.opening_hours && <><dt className="text-zinc-500">Horaires</dt><dd className="text-zinc-200">{p!.opening_hours}</dd></>}
                        {p!.access && <><dt className="text-zinc-500">Accès</dt><dd className="text-zinc-200">{p!.access}</dd></>}
                        {p!.wheelchair && <><dt className="text-zinc-500">Fauteuil</dt><dd className="text-zinc-200">{p!.wheelchair === "yes" ? "Accessible" : p!.wheelchair === "no" ? "Non accessible" : p!.wheelchair}</dd></>}
                        <dt className="text-zinc-500">Source</dt><dd className="text-zinc-200">{drawnRoom?.plan ? `Plan historique ${drawnRoom.plan.building}, étage ${drawnRoom.plan.floor}` : "Wemap"}</dd>
                    </dl>
                    {p!.description && <p className="mt-3 text-sm leading-relaxed text-zinc-400">{p!.description}</p>}
                </Section>
            </> : building && <Section title={`Lieux · ${floorName(level)}`}>
                {rooms.length ? <ul className="space-y-0.5">{[...rooms].sort((a, b) => naturalOrder.compare(a.properties.name || "", b.properties.name || "")).map(room => <li key={String(room.id)}>
                    <button onClick={() => onSelect(room)} className="flex w-full items-center gap-3 p-2 text-left text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"><MapPin className="h-3.5 w-3.5 shrink-0 text-campus-400" /><span className="truncate">{room.properties.name}</span>{room.properties.source === "plan" && <span className="ml-auto shrink-0 font-mono text-[9px] uppercase text-zinc-600">plan</span>}</button>
                </li>)}</ul> : <p className="text-sm text-zinc-500">Aucun lieu référencé à ce niveau.</p>}
            </Section>}
        </div>
    </aside>;
}
