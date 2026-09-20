/** Local default origin; configure your own origin before hosting. Self-hosters replace this and the copies in `public/robots.txt` and `public/sitemap.xml`. */
export const SITE_ORIGIN = 'http://localhost:3030';
export const HOME_CANONICAL = `${SITE_ORIGIN}/`;
export const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
export const SHARE_IMAGE = `${SITE_ORIGIN}/og-home.png`;

/** Result URLs are queries, not documents. Allow crawling so the directive is visible. */
export const SEARCH_ROBOTS = 'noindex, follow';
