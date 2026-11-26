# Google Search setup

The build generates `robots.txt`, a sitemap of public content pages and canonical URLs pointing to `https://fresh-moves-fix.vercel.app/`. Account, messages, profiles, settings and the 404 page are marked `noindex` and omitted from the sitemap. Noindex is not access control.

After these changes are deployed to production:

1. Open [Google Search Console](https://search.google.com/search-console/) using the Google account that owns the site, and add the **URL-prefix** property `https://fresh-moves-fix.vercel.app/`.
2. For this property, the owner's supplied `google5091c15ca9dc0202.html` is copied unchanged to the site root. Vercel's `cleanUrls` is disabled so the required `.html` address is not redirected to an extensionless URL. After production deploy, check that the exact file is publicly accessible at `https://fresh-moves-fix.vercel.app/google5091c15ca9dc0202.html`, then click Verify in Search Console. Keep the file deployed to retain verification. If Google requests a different file or meta tag, use the exact value Google supplies.
3. Check that `https://fresh-moves-fix.vercel.app/robots.txt` and `https://fresh-moves-fix.vercel.app/sitemap.xml` load publicly. Submit `https://fresh-moves-fix.vercel.app/sitemap.xml` in Search Console's Sitemaps section.
4. Use URL Inspection on `https://fresh-moves-fix.vercel.app/`, inspect the live URL, and request indexing if available. Consult the page indexing report for any Google-reported problem.

Google controls crawling, indexing and ranking. Submission does not guarantee a result or a particular position, and updates can take time. Preview deployments are not production and may be protected or marked noindex by Vercel.
