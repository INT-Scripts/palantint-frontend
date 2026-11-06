import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import {
  getPublishedClub,
  plainClubDescription,
  PORTAL_URL,
  publicClubDescription,
} from "@/lib/publicClubs";

interface ClubPageProps {
  params: Promise<{ slug: string }>;
}

function clubKind(type?: string | null): string {
  return type === "Association" ? "Association" : "Club";
}

export async function generateMetadata({ params }: ClubPageProps): Promise<Metadata> {
  const { slug } = await params;
  const club = await getPublishedClub(slug);
  if (!club) return { robots: { index: false, follow: false } };

  const summary = plainClubDescription(publicClubDescription(club.description));
  return {
    title: `${club.name} : ${clubKind(club.type).toLowerCase()} de Télécom SudParis et IMT-BS`,
    description: summary.length > 155 ? `${summary.slice(0, 154).trimEnd()}…` : summary,
    alternates: { canonical: `/clubs/${club.slug}` },
  };
}

/** Club sheets use `**bold**` and nothing else; the rest stays plain text. */
function renderBold(line: string) {
  return line.split("**").map((part, index) => (index % 2 ? <strong key={index}>{part}</strong> : part));
}

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params;
  const club = await getPublishedClub(slug);
  if (!club) notFound();

  const description = publicClubDescription(club.description);
  const parent = club.association_of_origin;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: club.name,
    description: plainClubDescription(description),
    url: `${PORTAL_URL}/clubs/${club.slug}`,
  };

  return (
    <section className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 sm:py-16 relative z-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/clubs" className="inline-flex items-center gap-2 mb-8 text-sm font-medium text-zinc-600 dark:text-stone-400 hover:text-zinc-950 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Tous les clubs
      </Link>
      <PortalHeader
        icon={<Users className="w-4 h-4" />}
        badgeText={clubKind(club.type)}
        title={club.name}
        subtitle="Campus de Télécom SudParis et IMT-BS, à Évry."
        accentColor="rose"
      />
      <div className="mt-8 space-y-4 text-zinc-700 dark:text-stone-300 leading-relaxed">
        {description.split(/\n+/).map((line, index) => <p key={index}>{renderBold(line)}</p>)}
      </div>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-stone-800 rounded-2xl p-6 shadow-sm text-sm">
        {parent && parent !== "Bureau / Asso Centrale" && (
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500 dark:text-stone-400">Rattachement</dt>
            <dd className="mt-1 font-semibold text-zinc-900 dark:text-stone-100">{parent}</dd>
          </div>
        )}
        <div>
          <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500 dark:text-stone-400">Local</dt>
          <dd className="mt-1 font-semibold text-zinc-900 dark:text-stone-100">
            {club.foyer_room ? (
              <Link href="/foyer" className="inline-flex items-center gap-1.5 underline underline-offset-4">
                <MapPin className="w-4 h-4" /> {club.foyer_room}, au foyer
              </Link>
            ) : "Non renseigné"}
          </dd>
        </div>
      </dl>
      <p className="mt-8 text-sm text-zinc-500 dark:text-stone-400">
        Présentation issue de la fiche du club. Pour situer les associations du campus, voir aussi le{" "}
        <a href="https://bananint.fr/blog/tsp-maisel-assos-premiers-reperes" className="underline underline-offset-4">guide du carnet BananINT</a>.
      </p>
    </section>
  );
}
