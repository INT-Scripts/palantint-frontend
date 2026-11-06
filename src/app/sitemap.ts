import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getPublicClubs, isPublishedClub, PORTAL_URL } from "@/lib/publicClubs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The backend is unreachable during the Docker build: render on request.
  await connection();
  const clubs = await getPublicClubs();
  const slugs = new Set(clubs.filter(isPublishedClub).map(club => club.slug));

  return [
    { url: PORTAL_URL },
    { url: `${PORTAL_URL}/clubs` },
    { url: `${PORTAL_URL}/foyer` },
    { url: `${PORTAL_URL}/laundry` },
    ...[...slugs].map(slug => ({ url: `${PORTAL_URL}/clubs/${slug}` })),
  ];
}
