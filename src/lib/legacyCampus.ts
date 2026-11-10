// The apartments and Foyer pages were retired for the campus map panel. Their links
// (profiles, timetable, bookmarks) are redirected by the proxy, which keeps `bldg`,
// `floor` and `room`. Floors there are historical plan floors: the server translates
// them into the geographic building, level and drawn room.

const LEGACY_PAGES: Record<string, string | null> = { "/palantint/apartments": null, "/palantint/foyer": "Foyer" };

export type LegacyTarget = { building: string | null; level: number | null; feature: string | null };

export const isLegacyCampusPage = (pathname: string) => pathname.replace(/\/$/, "") in LEGACY_PAGES;

function campusUrl(values: Record<string, string | number | null | undefined>) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (value !== null && value !== undefined && value !== "") query.set(key, String(value));
    return `/palantint/campus${query.size ? `?${query}` : ""}`;
}

export async function legacyCampusHref(pathname: string, params: URLSearchParams, resolve: (query: URLSearchParams) => Promise<LegacyTarget | null>) {
    const building = params.get("bldg") || LEGACY_PAGES[pathname.replace(/\/$/, "")];
    const floor = params.get("floor");
    const room = params.get("room");
    if (!building && !room) return campusUrl({});
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries({ building, floor, room })) if (value) query.set(key, value);
    // Without the server, the map still resolves the room itself.
    const target = await resolve(query).catch(() => null);
    return target
        ? campusUrl({ building: target.building, level: target.level, feature: target.feature, room: target.feature ? null : room })
        : campusUrl({ building, room });
}
