import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private, transactional or duplicate pages. Uploaded images under /uploads stay crawlable.
        disallow: ["/api/", "/profile", "/dev/", "/submit/payment", "/ingest/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
