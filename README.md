# Embassy for Two — The Diplomatic Circuit (v3)

A cooperative geography, trade, and politics puzzle game for Liam and Addison. One person clicks while both talk through the choices. No essays, private screens, accounts, timers or backend.

## Play

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then visit http://127.0.0.1:8000. Maps and optional fonts need internet. The remaining puzzles run from the included data without network access. Coordinate entry is available if the map cannot load.

## One dispatch

1. **Find the posting.** Five clues, a shared city pin and distance scoring. This remains the opening round.
2. **Read the exports.** Identify a country from a proportional mosaic of five leading export products.
3. **Uncover the link.** Find three of six countries sharing a hidden export, historical link or supply-chain role. Each distinct incorrect trio reveals another of three progressively easier clues.
4. **Trade five.** Each new dispatch randomly chooses export destinations, exported goods, or imported goods, avoiding the previous mode. Search for five countries or products, then lock to reveal the true ranking. Product names and six-digit HS codes are accepted; each match earns 20 points.
5. **Build the coalition.** A different three-country connection, sometimes combining two membership conditions.

The summit opens after all five assignments. Explore a photographed city guide with two travel ideas and a local dish linked to a recipe. Save future trips and virtual cooking dates in the passport, choose a shared off-duty activity and start another dispatch whenever you want. Intended for relaxed discussion; there is no minimum or maximum session length.

## Variety

The starter data contains **12 host cities, 12 real export profiles, 12 import-product baskets, 11 top-five export-market profiles, 9 hidden-link themes, 8 political connection rules, and 12 city guides**. Seeded generation varies the host, trade cases, political rules, country selections, and card order. It is a finite curated data library with many combinations, not unlimited unique facts or AI-written cases.

Completed host cities rotate through all twelve before a new cycle starts. Trade cases avoid the previous three completed dispatches where possible. Consecutive dispatches use different political rules. Unfinished rounds resume on reload. A new unfinished dispatch is not counted in the completed tour.

The China story remains reserved for later; China may appear as an ordinary trade destination in real-world data.

## Facts and sources

- Trade: **2023** goods exports, World Bank WITS / UN Comtrade, HS 1988/92 six-digit products. Each record links directly to its year-specific source. Product values are stored in US$ thousands; displayed billions are calculated from those values.
- Export mosaic percentages are **shares of the five displayed products**, not shares of all national exports. Broad industries and services are not represented by this chart. Product labels are shortened; original HS codes and values are available in the puzzle.
- Trading partner: largest reported destination by goods-export value in 2023, not the largest source of imports or total two-way trade partner. The dataset retains the source's reported export share.
- Geography/currency/UN accession: UNdata country profiles, linked in map reveals. City coordinates are approximate centre points. Bern is treated as Switzerland's federal city/seat of government.
- Membership: EU, NATO, OECD and Commonwealth official lists; curated snapshot **16 October 2026**, linked in reveals. Derived rules combine these membership flags. Geography rounds use UN regions or the hemisphere of the seat of government.

All factual answers are sourced; the summit and diplomatic favour system are fictional. There are no live politicians, AI-generated factual claims, or API calls to grade answers.

## Scoring and favours

Each assignment is worth up to 100 points, for a 500-point dispatch.

- Map: within 30 km earns 100 points, including with extra clues. Beyond 30 km: rounded `100 * exp(-(distanceKm - 30) / 2200)`, minus 5 per extra clue, with a minimum of 5 points. A 2,385 km miss earns 34 points before extra-clue deductions.
- Trade-five round: 20 points per matched country, from 0 to 100. Countries can be replaced before locking; no correctness feedback is given in advance.
- Other puzzles: start at 100; each distinct wrong attempt costs 15, with a floor of 20 when eventually solved.
- Reveal: finishes that puzzle for 0 points. You always have a way forward.
- Local tip: costs 15 host-country trust. Allied help: costs 15 allied confidence and eliminates a wrong option or confirms a valid seat (or adds one true country or product to the five-pick list). Presidential forgiveness: costs 20 confidence and removes one wrong-attempt penalty. Each favour can be used once per puzzle; no score penalty is added for using a hint.
- Completing an assignment earns 12 points of its related favour; a revealed answer earns 4. Favours cap at 100 and start at 45 each per dispatch.

## Saving

Progress and completed passport stamps are saved only in this browser's `localStorage`, under a new v3 key. Existing v3 saves keep finished rounds and upgrade unfinished stages 3 and 4. Older game saves are preserved. Saved trips and recipe links also stay in this browser. Clearing browser data removes local saves. Failed storage displays a message; the game remains playable in the open tab.

The passport can be downloaded as JSON, and a finished dispatch can export its postcard. Import is not implemented. New dispatch replaces an unfinished session after an in-app confirmation and retains completed stamps. `?playtest=1` uses a separate save for browser QA.

## Earlier versions

- `night-cable.html`: the v2 Cold War decision story, using `campaign*` files and separate saves.
- `classic.html`: the original map and partner-prediction prototype, using `app.js`, `missions.js` and separate passport storage.

## Development and checks

- `circuit-data.js`: sourced countries, trade values, organisation flags and rule definitions.
- `circuit-engine.js`: seeded generation, validation, guesses, hint economy and progression. No DOM dependency.
- `circuit.js`: interactive screens, chart layout, map, passport and autosave.
- `circuit.css`: v3 presentation, sharing the original variables and typography in `style.css`.

No installation or build is required. With Node.js:

```sh
node --test tests/*.test.cjs
node --check circuit.js
```

Tests validate 4,000 generated boards, exactly-three-answer connection rules, unique options, tour rotation, duplicate-guess guards, real hint costs, map scoring, reveal progression and serialization. Browser QA covers the full five-puzzle flow and saving.

To add content, extend the country data with verified facts and source URLs. New connection rules need at least three matches and three nonmatches in the country pool. Preserve year/snapshot labels when updating facts. Keep data versions and save migration in mind if removing or renaming country/rule IDs.

## Hosting

Still plain static HTML/CSS/JavaScript, compatible with GitHub Pages. Push the folder to a repository, then choose **Settings → Pages → Deploy from a branch → main → / (root)**. No secrets, build workflow or server are needed. Relative links support GitHub project URLs. A local Git commit does not publish the site; GitHub remote and deployment remain separate.

There are no analytics or uploaded game saves. Map and font providers receive normal asset requests. Do not commit personal passport exports or API keys.

## City guides and photo credits

City activities link to tourism boards or attraction operators; recipes link to their creators. All twelve city photographs are bundled locally, with creator, source, and licence links below each photo. Full attribution is in `assets/cities/credits.json`; images are cropped to fit the UI. `scripts/fetch-city-photos.py` is an optional maintenance script, not required to play.

Trade-market rankings use the 2023 source, not live data. Australia is excluded from the five-market puzzle because its source ranks an unidentified aggregate second. Supply-chain themes show complementary capabilities, not verified shipment routes between countries. Hidden connections seek the intended theme; incidental alternative commonalities can exist.

## Passport atlas and local plans

The passport opens a draggable orthographic globe with visited city pins. Click a pin or city button to open its saved page: city photograph, dish photograph, recipe, scores for every visit, and chosen local plan. Arrow keys rotate the globe. Land outlines are bundled from Natural Earth (public domain); the globe works offline. City pages have browser-local hash links, such as `#city=NZL`.

Each summit offers three city-specific plans: two local outings and a food date. A click saves the selection automatically. New passport records retain all five round scores; older stamps retain their previously saved total. Existing completed scores are not recalculated.

Dish photographs are bundled in `assets/dishes/`, with full attribution in `credits.json`. They illustrate the dish rather than a photograph of the linked recipe. Imported-product source snapshots are in `assets/trade-imports.json`, with provenance in `scripts/fetch-trade-imports.py`. All trade modes use 2023 WITS / UN Comtrade HS 1988/92 data.

Writing convention: use the Oxford comma in user-facing lists.
