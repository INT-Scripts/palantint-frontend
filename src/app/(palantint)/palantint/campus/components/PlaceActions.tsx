"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Check, Copy, Crosshair, Eye, GraduationCap, History, Loader2, MapPinned, NotebookPen, Pin, PinOff, UserSearch, Users, UsersRound, Waypoints } from "lucide-react";
import { fetchPrivate } from "@/lib/api";
import { timetableHref } from "@/lib/timetableContext";
import { Action, Section } from "./panelParts";

type Person = { id: string; first_name: string; last_name: string };
type ClubLink = { id: string | null; name: string };
type Course = { id: string; name: string; start_time: string; end_time: string; room: string | null };
export type OverlayPerson = Person & { link: string; board?: boolean };
export type OverlayHome = { location_id: string; people: OverlayPerson[] };
/** People placed on the map by their flats; lines join each flat to the `hub` place when there is one. */
export type MapOverlay = { title: string; summary: string; homes: OverlayHome[]; hub?: string };

type Result =
    | { kind: "where"; items: { person: Person; now: Course | null; next: Course | null }[] }
    | { kind: "history"; residents: (Person & { started_at: string | null; ended_at: string | null })[] }
    | { kind: "groups"; week: string; events: number; groups: { id: string; name: string; sessions: number }[] }
    | { kind: "note" }
    | { kind: "error"; action: string };

const clock = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const shortDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const monthYear = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });
const fullName = (person: Person) => `${person.first_name} ${person.last_name}`.trim();
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;
const sameDay = (value: string) => new Date(value).toDateString() === new Date().toDateString();
const slot = (course: Course) => `${sameDay(course.start_time) ? "" : `${shortDay.format(new Date(course.start_time))} `}${clock.format(new Date(course.start_time))}–${clock.format(new Date(course.end_time))}`;
const homeCount = (homes: OverlayHome[]) => homes.reduce((count, home) => count + home.people.length, 0);
const stay = (value: string | null) => value ? monthYear.format(new Date(value)) : "…";

function PersonLink({ person, detail }: { person: Person; detail?: ReactNode }) {
    return <Link href={`/palantint/students/${person.id}`} className="flex items-baseline gap-2 p-1.5 text-sm text-student-400 hover:bg-zinc-900">
        <span className="truncate">{fullName(person)}</span>{detail && <span className="ml-auto shrink-0 font-mono text-[10px] text-zinc-500">{detail}</span>}
    </Link>;
}

function NoteForm({ occupants }: { occupants: Person[] }) {
    const [personId, setPersonId] = useState(occupants[0]?.id || "");
    const [text, setText] = useState("");
    const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const save = async () => {
        if (!text.trim()) return;
        const form = new FormData();
        form.append("type", "NOTE");
        form.append("content", text.trim());
        setState("saving");
        try { await fetchPrivate(`/students/${personId}/media`, { method: "POST", body: form }); setText(""); setState("saved"); }
        catch { setState("error"); }
    };
    const field = "w-full border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-campus-400";
    return <div className="space-y-2">
        {occupants.length > 1 && <select value={personId} onChange={event => setPersonId(event.target.value)} aria-label="Personne" className={field}>
            {occupants.map(person => <option key={person.id} value={person.id}>{fullName(person)}</option>)}
        </select>}
        <textarea value={text} onChange={event => { setText(event.target.value); setState("idle"); }} rows={3} placeholder="Note de recherche…" aria-label="Note" className={field} />
        <div className="flex items-center gap-3">
            <button onClick={save} disabled={!text.trim() || state === "saving"} className="border border-campus-500/60 bg-campus-500/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-campus-300 disabled:opacity-40">Ajouter</button>
            {state === "saved" && <Link href={`/palantint/students/${personId}`} className="text-xs text-emerald-400 hover:text-white">Note ajoutée · voir la fiche</Link>}
            {state === "error" && <span className="text-xs text-red-400">La note n’a pas été enregistrée.</span>}
        </div>
    </div>;
}

/**
 * The labelled action row of a place, and the result of the action in use. Actions that
 * place people on the map hand an overlay to the map, which keeps it while other places
 * are opened; the others show their result just below the row.
 */
export default function PlaceActions({ locationId, context, clubs, copied, onCopy, isAdmin, pinned, onTogglePin, onImmersive, onGoToRoom, overlay, onOverlay }: {
    locationId: string | null;
    context: { occupants: Person[]; agenda_room: string | null; apartment: unknown } | null;
    clubs: ClubLink[];
    copied: boolean;
    onCopy: () => void;
    isAdmin: boolean;
    pinned: boolean;
    onTogglePin: () => void;
    onImmersive: () => void;
    onGoToRoom: (room: string) => void;
    overlay: (MapOverlay & { action?: string }) | null;
    onOverlay: (overlay: (MapOverlay & { action: string }) | null) => void;
}) {
    const [result, setResult] = useState<Result | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const occupants = context?.occupants || [];
    const clubIds = clubs.filter(club => club.id);
    // Overlays are tied to the place that drew them; another place shows its own actions as inactive.
    const overlayAction = overlay?.action?.startsWith(`${locationId}:`) ? overlay.action.slice(locationId!.length + 1) : null;
    const shown = result?.kind === "error" ? null : result?.kind;

    const run = async (action: string, task: () => Promise<void>) => {
        if (busy) return;
        // A second press hides the result.
        if (shown === action) { setResult(null); return; }
        if (overlayAction === action) { onOverlay(null); return; }
        setBusy(action);
        try { await task(); } catch { setResult({ kind: "error", action }); } finally { setBusy(null); }
    };
    const draw = (action: string, overlay: MapOverlay) => { setResult(null); onOverlay({ ...overlay, action: `${locationId}:${action}` }); };

    const locate = () => run("where", async () => {
        const items = await Promise.all(occupants.map(person => fetchPrivate(`/maps/indoor/people/${person.id}/whereabouts`)));
        // One person in class right now: go straight to the room.
        if (items.length === 1 && items[0].now?.room) { onGoToRoom(items[0].now.room); return; }
        setResult({ kind: "where", items });
    });
    const history = () => run("history", async () => setResult({ kind: "history", ...(await fetchPrivate(`/maps/indoor/locations/${locationId}/residents`)) }));
    const weekGroups = () => run("groups", async () => setResult({ kind: "groups", ...(await fetchPrivate(`/maps/indoor/locations/${locationId}/groups`)) }));
    const note = () => run("note", async () => setResult({ kind: "note" }));
    const homesOf = async (endpoint: (person: Person) => string) => {
        const answers = await Promise.all(occupants.map(person => fetchPrivate(endpoint(person))));
        const merged = new Map<string, OverlayHome>();
        for (const answer of answers) for (const home of answer.homes as OverlayHome[]) {
            const known = merged.get(home.location_id);
            merged.set(home.location_id, { location_id: home.location_id, people: [...(known?.people || []), ...home.people.filter(person => !known?.people.some(other => other.id === person.id))] });
        }
        return { answers, homes: [...merged.values()].filter(home => home.location_id !== locationId || home.people.some(person => !occupants.some(occupant => occupant.id === person.id))) };
    };
    const circle = () => run("circle", async () => {
        const { homes } = await homesOf(person => `/maps/indoor/people/${person.id}/circle`);
        draw("circle", { title: `Cercle · ${occupants.map(fullName).join(", ")}`, summary: `${plural(homeCount(homes), "personne")} liée${homeCount(homes) > 1 ? "s" : ""} · ${plural(homes.length, "logement")}`, homes, hub: locationId! });
    });
    const cohort = () => run("cohort", async () => {
        const { answers, homes } = await homesOf(person => `/maps/indoor/people/${person.id}/cohort`);
        const groups = [...new Set(answers.flatMap(answer => answer.groups as string[]))];
        draw("cohort", { title: `Même promo · ${groups.join(", ") || "aucun groupe"}`, summary: `${plural(homeCount(homes), "personne")} · ${plural(homes.length, "logement")}`, homes, hub: locationId! });
    });
    const presence = () => run("presence", async () => {
        const answer = await fetchPrivate(`/maps/indoor/locations/${locationId}/presence`);
        if (!answer.event) { draw("presence", { title: "Présents", summary: "Aucun cours aujourd’hui avant maintenant.", homes: [] }); return; }
        const groups = (answer.groups as { name: string }[]).map(group => group.name).join(", ");
        draw("presence", {
            title: `${answer.ongoing ? "En cours" : "Dernier cours"} · ${answer.event.name}`,
            summary: `${slot(answer.event)}${groups ? ` · ${groups}` : ""} · ${plural(answer.people, "personne")}, ${plural(homeCount(answer.homes), "logement")} connu${homeCount(answer.homes) > 1 ? "s" : ""}`,
            homes: answer.homes, hub: locationId!,
        });
    });
    const members = () => run("members", async () => {
        const answers = await Promise.all(clubIds.map(club => fetchPrivate(`/maps/indoor/organizations/${club.id}/homes`)));
        const homes = answers.flatMap(answer => answer.homes as OverlayHome[]);
        const total = answers.reduce((count, answer) => count + answer.members, 0), board = answers.reduce((count, answer) => count + answer.board, 0);
        draw("members", { title: `Membres · ${answers.map(answer => answer.organization.name).join(", ")}`, summary: `${plural(total, "membre")} dont ${board} au bureau · ${plural(homes.length, "logement")}`, homes, hub: locationId! });
    });

    const hasOccupants = !!occupants.length;
    return <>
        <div className="flex flex-wrap gap-x-3 gap-y-4 border-t border-zinc-800/80 px-5 py-4">
            {context?.agenda_room && <Action href={timetableHref({ room: context.agenda_room, week: new Date() })} icon={CalendarDays} label="Agenda" tone="text-timetable-400" />}
            {context?.agenda_room && locationId && <Action onClick={presence} icon={UserSearch} label="Présents" tone="text-student-400" active={overlayAction === "presence"} busy={busy === "presence"} />}
            {context?.agenda_room && locationId && <Action onClick={weekGroups} icon={UsersRound} label="Groupes" tone="text-timetable-400" active={shown === "groups"} busy={busy === "groups"} />}
            {occupants.length > 1 && <Action href={timetableHref({ students: occupants.map(person => person.id), week: new Date() })} icon={Users} label="Disponibilités" tone="text-timetable-400" />}
            {hasOccupants && <Action onClick={locate} icon={Crosshair} label="Localiser" tone="text-student-400" active={shown === "where"} busy={busy === "where"} />}
            {hasOccupants && <Action onClick={circle} icon={Waypoints} label="Cercle" tone="text-student-400" active={overlayAction === "circle"} busy={busy === "circle"} />}
            {hasOccupants && <Action onClick={cohort} icon={GraduationCap} label="Même promo" tone="text-student-400" active={overlayAction === "cohort"} busy={busy === "cohort"} />}
            {!!context?.apartment && locationId && <Action onClick={history} icon={History} label="Historique" tone="text-housing-400" active={shown === "history"} busy={busy === "history"} />}
            {!!clubIds.length && locationId && <Action onClick={members} icon={MapPinned} label="Membres" tone="text-orga-400" active={overlayAction === "members"} busy={busy === "members"} />}
            {hasOccupants && isAdmin && <Action onClick={note} icon={NotebookPen} label="Note" tone="text-zinc-300" active={shown === "note"} />}
            <Action onClick={onImmersive} icon={Eye} label="Vue immersive" tone="text-campus-400" />
            <Action onClick={onTogglePin} icon={pinned ? PinOff : Pin} label={pinned ? "Désépingler" : "Épingler"} tone="text-timetable-400" active={pinned} />
            <Action onClick={onCopy} icon={copied ? Check : Copy} label={copied ? "Lien copié" : "Copier le lien"} tone={copied ? "text-emerald-400" : "text-zinc-300"} />
        </div>
        {busy && <p className="flex items-center gap-2 px-5 pb-3 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Chargement…</p>}
        {result?.kind === "error" && <p className="px-5 pb-3 text-xs text-red-400">Ces informations ne sont pas disponibles pour le moment.</p>}
        {result?.kind === "where" && <Section title="Localiser">
            <div className="space-y-3">{result.items.map(({ person, now, next }) => <div key={person.id}>
                <PersonLink person={person} />
                {[["Maintenant", now], ["Prochain cours", next]].map(([label, course]) => course && typeof course === "object" ? <button key={label as string} disabled={!course.room} onClick={() => course.room && onGoToRoom(course.room)} className="flex w-full items-baseline gap-2 px-1.5 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-900 disabled:hover:bg-transparent">
                    <span className="w-24 shrink-0 font-mono text-[10px] uppercase text-zinc-500">{label as string}</span><span className="min-w-0 flex-1 truncate">{course.name}</span><span className="shrink-0 font-mono text-[10px] text-campus-300">{course.room} · {slot(course)}</span>
                </button> : null)}
                {!now && !next && <p className="px-1.5 text-xs text-zinc-500">Aucun cours avec salle dans les sept prochains jours.</p>}
            </div>)}</div>
        </Section>}
        {result?.kind === "history" && <Section title={`Historique · ${plural(result.residents.length, "résident")}`}>
            {result.residents.length ? <div className="space-y-0.5">{result.residents.map(person => <PersonLink key={`${person.id}:${person.started_at}`} person={person} detail={person.ended_at ? `${stay(person.started_at)} – ${stay(person.ended_at)}` : `depuis ${stay(person.started_at)}`} />)}</div>
                : <p className="text-sm text-zinc-500">Aucun résident connu.</p>}
        </Section>}
        {result?.kind === "groups" && <Section title={`Groupes · semaine du ${shortDay.format(new Date(result.week))}`}>
            {result.groups.length ? <div className="space-y-0.5">{result.groups.map(group => <Link key={group.id} href={`/palantint/class-groups/${group.id}`} className="flex items-baseline gap-2 p-1.5 text-sm text-timetable-400 hover:bg-zinc-900"><span className="truncate">{group.name}</span><span className="ml-auto shrink-0 font-mono text-[10px] text-zinc-500">{plural(group.sessions, "séance")}</span></Link>)}</div>
                : <p className="text-sm text-zinc-500">{result.events ? `${plural(result.events, "événement")}, sans groupe pédagogique.` : "Aucun événement cette semaine."}</p>}
        </Section>}
        {result?.kind === "note" && <Section title="Note de recherche"><NoteForm occupants={occupants} /></Section>}
    </>;
}

/** The people an overlay placed on the map, by flat; a flat opens its place. */
export function OverlaySection({ overlay, describe, onSelect, onClear }: { overlay: MapOverlay; describe: (locationId: string) => string | null; onSelect: (locationId: string) => void; onClear: () => void }) {
    return <Section title={overlay.title} action={<button onClick={onClear} className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:text-white">Effacer</button>}>
        <p className="mb-2 text-xs text-zinc-400">{overlay.summary}</p>
        {!overlay.homes.length ? <p className="text-sm text-zinc-500">Aucun logement connu.</p>
            : <ul className="max-h-64 space-y-1 overflow-y-auto">{overlay.homes.map(home => {
                const place = describe(home.location_id);
                return <li key={home.location_id} className="border border-zinc-800/80">
                    <button onClick={() => onSelect(home.location_id)} disabled={!place} className="flex w-full items-center gap-2 px-2 py-1.5 text-left font-mono text-[11px] text-campus-300 hover:bg-zinc-900 disabled:text-zinc-500">{place || "Logement hors carte"}</button>
                    {home.people.map(person => <PersonLink key={person.id} person={person} detail={person.board ? `Bureau · ${person.link}` : person.link} />)}
                </li>;
            })}</ul>}
    </Section>;
}
