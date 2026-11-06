/** Server-side access to the public club directory, for pages and metadata search engines can read. */

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || "http://backend:3000";
const CLUBS_REVALIDATE_SECONDS = 3600;
/** Below this length a club sheet is not worth a page of its own in search results. */
const MIN_PUBLISHED_DESCRIPTION_LENGTH = 100;

export const PORTAL_URL = "https://portal.bananint.fr";

export interface PublicClub {
  id: string;
  name: string;
  slug: string;
  type?: string | null;
  association_of_origin?: string | null;
  foyer_room?: string | null;
  description?: string | null;
}

/** Drops the paragraphs and lines that mention a person through an `@[id]` token. */
export function publicClubDescription(description?: string | null): string {
  return (description ?? "")
    .split("\n")
    .filter((line, index, lines) => !line.includes("@[") && !lines[index + 1]?.includes("@["))
    .join("\n")
    .trim();
}

export function plainClubDescription(description: string): string {
  return description.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

export function isPublishedClub(club: PublicClub): boolean {
  return publicClubDescription(club.description).length >= MIN_PUBLISHED_DESCRIPTION_LENGTH;
}

export async function getPublicClubs(): Promise<PublicClub[]> {
  try {
    const response = await fetch(`${INTERNAL_API_URL}/clubs`, { next: { revalidate: CLUBS_REVALIDATE_SECONDS } });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function getPublishedClub(slug: string): Promise<PublicClub | undefined> {
  const clubs = await getPublicClubs();
  return clubs.find(club => club.slug === slug && isPublishedClub(club));
}
