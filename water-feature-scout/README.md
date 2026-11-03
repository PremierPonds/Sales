# Water Feature Scout

Scheduled agent for Premier Ponds. It keeps one Excel workbook of homes in Northern Virginia and Maryland that mention a maintainable water feature.

The search reads public web-search snippets. It does not open Zillow, Redfin, Realtor, or Homes.com. DuckDuckGo often refuses repeated searches. Set `BRAVE_SEARCH_API_KEY` before you rely on the weekly run. Do not put that key in the repo.

## What it saves

The Listings sheet columns are:

Address, City, State, Zip Code, Keyword Matched, Status, Source, Listing URL, First Seen, Last Seen

The same street and ZIP stay on one row. A later find adds keywords instead of adding a second row.

## Where it looks

Northern Virginia: Alexandria, Arlington, Fairfax County, the City of Fairfax, Falls Church, Loudoun County, and Prince William County (including Manassas and Manassas Park).

Maryland: every county except Garrett, Allegany, Washington, and St. Mary's.

## When it runs

After you deploy it, two schedules run in UTC:

- Active listings: Monday at 12:00 UTC (7:00 AM Eastern Standard Time, 8:00 AM Eastern Daylight Time). Each run searches one phrase across every city in the service area, then the next run continues with the next phrase.
- Sold listings: the 1st of the month at the same UTC time, with the same city sweep.

Dev mode does not fire schedules on its own. Call the tool, or post to `/v1/dev/schedules/active-weekly` and `/v1/dev/schedules/sold-monthly`.

## Check the gates

```bash
cd water-feature-scout
node --import tsx bot/lib/self-check.ts
npx @grok/agent-sdk validate --dir .
npx tsc --noEmit -p .
npx @grok/agent-sdk tool call scan_listings --dir . --input '{"status":"active","fixtureHits":[{"title":"40903 Grenata Preserve Pl, Leesburg, VA 20175 | Redfin","url":"https://www.redfin.com/VA/Leesburg/40903-Grenata-Preserve-Pl-20175/home/12102710","snippet":"Hardscape includes a koi pond and waterfall."}]}'
```
