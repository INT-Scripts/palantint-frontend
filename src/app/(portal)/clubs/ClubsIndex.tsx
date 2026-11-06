import Link from "next/link";
import { isPublishedClub, type PublicClub } from "@/lib/publicClubs";

/** Server-rendered list of the directory, readable without running the interactive client. */
export default function ClubsIndex({ clubs }: { clubs: PublicClub[] }) {
  if (clubs.length === 0) return null;
  const names = [...clubs].sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <section className="max-w-6xl w-full mx-auto px-4 pb-16 relative z-10">
      <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-stone-50 mb-6">
        Toutes les associations et tous les clubs du campus
      </h2>
      <ul className="grid gap-x-6 gap-y-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 text-sm text-zinc-600 dark:text-stone-400">
        {names.map(club => (
          <li key={club.id}>
            {isPublishedClub(club)
              ? <Link href={`/clubs/${club.slug}`} className="font-semibold text-zinc-900 dark:text-stone-100 underline underline-offset-4">{club.name}</Link>
              : club.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
