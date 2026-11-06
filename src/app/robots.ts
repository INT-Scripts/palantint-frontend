import type { MetadataRoute } from "next";
import { PORTAL_URL } from "@/lib/publicClubs";

// Private routes are left out on purpose: this file is public, and they redirect
// anonymous visitors to /login, so listing them would only advertise their paths.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${PORTAL_URL}/sitemap.xml`,
  };
}
