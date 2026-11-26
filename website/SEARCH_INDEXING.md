# Google Search setup

The build generates `robots.txt`, a sitemap of public content pages and canonical URLs pointing to `https://fresh-moves-fix.vercel.app/`. Account, messages, profiles, settings and the 404 page are marked `noindex` and omitted from the sitemap. Noindex is not access control.

After these changes are deployed to production:

1. Open [Google Search Console](https://search.google.com/search-console/) using the Google account that owns the site, and add the **URL-prefix** property `https://fresh-moves-fix.vercel.app/`.
2. Complete one of Google's ownership verification methods. If Google provides an HTML verification file or meta tag, add that exact value to the production site; don't invent a verification token.
3. Check that `https://fresh-moves-fix.vercel.app/robots.txt` and `https://fresh-moves-fix.vercel.app/sitemap.xml` load publicly. Submit `https://fresh-moves-fix.vercel.app/sitemap.xml` in Search Console's Sitemaps section.
4. Use URL Inspection on `https://fresh-moves-fix.vercel.app/`, inspect the live URL, and request indexing if available. Consult the page indexing report for any Google-reported problem.

Google controls crawling, indexing and ranking. Submission does not guarantee a result or a particular position, and updates can take time. Preview deployments are not production and may be protected or marked noindex by Vercel.
