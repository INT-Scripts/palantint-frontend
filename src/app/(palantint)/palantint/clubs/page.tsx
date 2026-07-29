"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPublic } from "@/lib/api";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PalantintClubCard, { PalantintClub } from "../components/PalantintClubCard";
import PalantintFloorSelector from "../components/PalantintFloorSelector";
import { PALETTE } from "@/lib/colors";
import { FOYER_BUILDINGS as BUILDINGS } from "@/lib/buildings";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<PalantintClub[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFloor, setActiveFloor] = useState("ALL");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    document.title = "Associations — PalantINT";
    fetchPublic("/clubs")
      .then((data) => setClubs(data || []))
      .catch((err) => console.error("Error fetching clubs:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      window.scrollTo(0, 0);
    }
  }, [loading]);

  const filteredClubs = useMemo(() => {
    return clubs.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

      let matchesFloor = true;
      if (activeFloor !== "ALL") {
        if (!c.foyer_room) {
          matchesFloor = false;
        } else {
          const roomUpper = c.foyer_room.toUpperCase();
          matchesFloor =
            roomUpper.includes(`F${activeFloor}`) ||
            roomUpper.startsWith(`F0${activeFloor}`) ||
            roomUpper.startsWith(activeFloor);
        }
      }

      return matchesSearch && matchesFloor;
    });
  }, [clubs, search, activeFloor]);

  const groupedClubs = useMemo(() => {
    return filteredClubs.reduce((acc, club) => {
      const origin = club.association_of_origin || club.type || "Autre";
      if (!acc[origin]) acc[origin] = [];
      acc[origin].push(club);
      return acc;
    }, {} as Record<string, PalantintClub[]>);
  }, [filteredClubs]);

  const sortedOrigins = useMemo(() => {
    return Object.keys(groupedClubs).sort((a, b) => {
      if (a.toLowerCase().includes("bureau")) return -1;
      if (b.toLowerCase().includes("bureau")) return 1;
      return a.localeCompare(b);
    });
  }, [groupedClubs]);

  const getOriginBadgeStyle = (origin?: string) => {
    if (!origin) return "bg-zinc-900 text-zinc-400 border-zinc-800";
    const u = origin.toUpperCase();
    if (u.includes("BDE")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (u.includes("BDA")) return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    if (u.includes("ASINT") || u.includes("BDS")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    return "bg-amber-500/10 text-amber-400 border-amber-500/30";
  };

  return (
    <div className="min-h-screen bg-zinc-950 selection:bg-orga-500/30 font-sans">
      {/* Ambient Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[15%] left-[10%] w-[35%] h-[45%] bg-orga-600/10 blur-[150px] rounded-none mix-blend-screen" />
        <div className="absolute top-[40%] right-[-10%] w-[40%] h-[35%] bg-zinc-800/10 blur-[150px] rounded-none mix-blend-screen" />
      </div>

      <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8 space-y-8">
        <PageHeader
          badgeText="Entity Database // Active"
          title1="Accredited"
          title2="Associations"
          titleGradient="from-orga-400 to-orga-600"
          subtitle="Centralized registry for authorized campus groups."
          colorName="orga"
          searchPlaceholder="QUERY: ASSOCIATION NAME"
          searchValue={search}
          onSearchChange={setSearch}
        />

        {/* Floor Filter Toolbar */}
        <PalantintFloorSelector
          buildings={BUILDINGS}
          activeBuilding="Foyer"
          activeFloor={activeFloor}
          onSelectFloor={setActiveFloor}
          title="Filtre Étage Locaux Foyer"
          accentColor="orga"
          showAllFloorsOption={true}
        />

        <div className="flex flex-col gap-24 pt-4">
          {sortedOrigins.map((origin) => {
            const originClubs = groupedClubs[origin].sort((a, b) => a.name.localeCompare(b.name));
            return (
              <section key={origin} className="space-y-8 relative">
                <div className="flex items-center gap-6 sticky top-24 z-20 bg-zinc-950/80 backdrop-blur-3xl py-4 border-y border-zinc-800/60 rounded-none">
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                    <span className="text-orga-500">{origin}</span>
                    <span className="text-xs font-mono text-zinc-500">COUNT: {originClubs.length}</span>
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-orga-500/50 to-transparent" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {originClubs.map((club) => (
                    <PalantintClubCard
                      key={club.id}
                      club={club}
                      isHovered={hoveredId === club.id}
                      onMouseEnter={() => setHoveredId(club.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => router.push(`/palantint/clubs/${club.id}`)}
                      getOriginBadgeStyle={getOriginBadgeStyle}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
