"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { campusHref } from "@/lib/campus";
import { lookupCampusRoom } from "@/lib/campusData";

type Match = { feature_id: string; building_id: number | null; levels: number[] };

export default function IndoorRoomLink({ room }: { room: string }) {
    const [result, setResult] = useState<{ room: string; match: Match | null } | null>(null);
    useEffect(() => {
        let active = true;
        lookupCampusRoom(room)
            .then((matches: Match[]) => { if (active) setResult({ room, match: matches.length === 1 ? matches[0] : null }); })
            .catch(() => { if (active) setResult({ room, match: null }); });
        return () => { active = false; };
    }, [room]);
    const match = result?.room === room ? result.match : null;
    if (!match) return null;
    return <Link href={campusHref({ feature: match.feature_id, building: match.building_id === null ? undefined : String(match.building_id), level: match.levels[0] })} className="inline-flex items-center gap-2 text-xs text-campus-400 hover:text-white"><MapPin className="w-3 h-3" /> Voir sur le plan</Link>;
}
