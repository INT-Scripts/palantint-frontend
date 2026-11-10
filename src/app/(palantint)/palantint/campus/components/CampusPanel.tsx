"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, Check, Copy, Layers, Loader2, MapPin, Users, WashingMachine, X } from "lucide-react";
import BuildingOutline from "@/components/palantint/BuildingOutline";
import { floorName, type CampusBuilding as Building, type Place } from "@/lib/campus";
import type { RentRange, ResidenceSummary } from "@/lib/campusData";
import { timetableHref } from "@/lib/timetableContext";

type ClubLink = { id: string | null; name: string; logo_url?: string | null };
type Allowances = { scholarship: number | null; non_scholarship: number | null };
export type ApartmentDetails = { type: string | null; floor: string | null; surface_m2: number | null; rent: number | null; allowances: Allowances; net_rent: Allowances };
export type PlaceContext = {
    code: string;
    kind: string;
    occupants: { id: string; first_name: string; last_name: string }[];
    clubs: ClubLink[];
    events: { id: string; name: string; start_time: string; end_time: string }[];
    agenda_room: string | null;
    apartment: ApartmentDetails | null;
};
export type DrawnRoom = { plan?: { building: string; floor: string; room: string }; clubs?: ClubLink[] };

const levelLabel = (value: number) => value === 0 ? "RDC" : String(value);
const naturalOrder = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
const eventDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const eventTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const euros = (value: number | null) => value === null ? "—" : `${value} €`;
const rentRange = (range: RentRange) => !range ? "—" : range.min === range.max ? euros(range.min) : `${range.min}–${range.max} €`;
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

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

function LaundryLink({ code }: { code: string }) {
    return <Link title={`Laverie ${code}`} aria-label={`Laverie ${code}`} href={`/palantint/laundry?building=${code}`} className="border-l border-zinc-800 p-2 text-media-400 hover:bg-zinc-900"><WashingMachine className="h-4 w-4" /></Link>;
}

// Building view: flats per type and rent range for each residence of the building.
function ResidenceSummaries({ building, housing }: { building: Building; housing: Record<string, ResidenceSummary> | null }) {
    return <div className="space-y-2">{building.residences!.map(residence => {
        const summary = housing?.[residence.code];
        return <div key={residence.code} className="border border-zinc-800">
            <div className="flex items-center">
                <span className="flex flex-1 items-center gap-2 px-3 py-2 font-mono text-xs text-housing-400"><Building2 className="h-4 w-4" />{residence.code}</span>
                {summary && <span className="px-3 font-mono text-[11px] text-zinc-500">{summary.apartments} logements · {summary.occupied} occupés</span>}
                {residence.laundry && <LaundryLink code={residence.code} />}
            </div>
            {summary && <dl className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 border-t border-zinc-800/80 px-3 py-2 text-xs">
                {summary.types.map(kind => <div key={kind.type} className="contents">
                    <dt className="text-zinc-300">{capitalize(kind.type)}</dt>
                    <dd className="text-right font-mono text-zinc-500">×{kind.count}</dd>
                    <dd className="text-right font-mono text-zinc-200">{rentRange(kind.rent)}</dd>
                </div>)}
            </dl>}
        </div>;
    })}</div>;
}

function ApartmentSection({ apartment }: { apartment: ApartmentDetails }) {
    const net = (key: keyof Allowances) => apartment.allowances[key] === null ? euros(apartment.net_rent[key]) : `${euros(apartment.net_rent[key])} (−${apartment.allowances[key]} €)`;
    return <Section title="Logement">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {apartment.type && <><dt className="text-zinc-500">Type</dt><dd className="text-zinc-200">{capitalize(apartment.type)}</dd></>}
            {apartment.surface_m2 !== null && <><dt className="text-zinc-500">Surface</dt><dd className="text-zinc-200">{apartment.surface_m2} m²</dd></>}
            <dt className="text-zinc-500">Loyer</dt><dd className="font-semibold text-housing-400">{euros(apartment.rent)} / mois</dd>
            <dt className="text-zinc-500">Boursier</dt><dd className="text-emerald-400">{net("scholarship")}</dd>
            <dt className="text-zinc-500">Non boursier</dt><dd className="text-zinc-200">{net("non_scholarship")}</dd>
        </dl>
        <p className="mt-2 text-[11px] text-zinc-500">Montants après aide au logement (APL/ALS) estimée par la Maisel.</p>
    </Section>;
}

function ClubRow({ club }: { club: ClubLink }) {
    const body = <>{club.logo_url ? <img src={club.logo_url} alt="" className="h-6 w-6 shrink-0 border border-zinc-800 bg-white object-contain" /> : <Users className="h-3.5 w-3.5 shrink-0" />}<span className="truncate">{club.name}</span></>;
    return club.id
        ? <Link href={`/palantint/clubs?club=${encodeURIComponent(club.id)}`} className="flex items-center gap-2 p-2 text-sm text-orga-400 hover:bg-zinc-900">{body}</Link>
        : <div className="flex items-center gap-2 p-2 text-sm text-zinc-400">{body}</div>;
}

export default function CampusPanel({ building, buildingFeature, level, rooms, selected, context, loadingContext, drawnRoom, housing, copied, onSelect, onCloseBuilding, onClosePlace, onCopy }: {
    building?: Building;
    buildingFeature?: Place;
    level: number;
    rooms: Place[];
    selected?: Place;
    context: PlaceContext | null;
    loadingContext: boolean;
    drawnRoom: DrawnRoom | null;
    housing: Record<string, ResidenceSummary> | null;
    copied: boolean;
    onSelect: (feature: Place) => void;
    onCloseBuilding: () => void;
    onClosePlace: () => void;
    onCopy: () => void;
}) {
    const place = selected && selected.properties.kind !== "building" ? selected : undefined;
    const p = place?.properties;
    const clubs = context?.clubs.length ? context.clubs : drawnRoom?.clubs || [];
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
            {building && !!residences.length && <div className="px-5 pb-4">{place
                ? <div className="flex flex-wrap gap-2">{residences.map(residence => <div key={residence.code} className="flex border border-zinc-800"><span className="flex items-center gap-2 px-3 py-2 font-mono text-xs text-housing-400"><Building2 className="h-4 w-4" />{residence.code}</span>{residence.laundry && <LaundryLink code={residence.code} />}</div>)}</div>
                : <ResidenceSummaries building={building} housing={housing} />}</div>}
            {place ? <>
                <div className="flex flex-wrap gap-4 border-t border-zinc-800/80 px-5 py-4">
                    {context?.agenda_room && <Action href={timetableHref({ room: context.agenda_room, week: new Date() })} icon={CalendarDays} label="Agenda" tone="text-timetable-400" />}
                    {(context?.occupants.length || 0) > 1 && <Action href={timetableHref({ students: context!.occupants.map(person => person.id), week: new Date() })} icon={Users} label="Disponibilités" tone="text-timetable-400" />}
                    <Action onClick={onCopy} icon={copied ? Check : Copy} label={copied ? "Lien copié" : "Copier le lien"} tone={copied ? "text-emerald-400" : "text-zinc-300"} />
                    {loadingContext && <Loader2 className="m-3 h-4 w-4 animate-spin text-zinc-500" />}
                </div>
                {context?.apartment && <ApartmentSection apartment={context.apartment} />}
                {(!!context?.occupants.length || !!clubs.length) && <Section title="Occupants et associations">
                    <div className="space-y-1">
                        {context?.occupants.map(person => <Link key={person.id} href={`/palantint/students/${person.id}`} className="flex items-center gap-2 p-2 text-sm text-student-400 hover:bg-zinc-900"><Users className="h-3.5 w-3.5" />{person.first_name} {person.last_name}</Link>)}
                        {clubs.map(club => <ClubRow key={club.id || club.name} club={club} />)}
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
