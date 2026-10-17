# Embassy for Two — The Night Cable (v2)

A cooperative Cold War diplomatic story for Liam and Addison. One person clicks and types while both discuss every decision over a shared screen. No secret answers or hand-offs are needed.

## Play

Open `index.html` in a browser, or serve this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit http://127.0.0.1:8000. The core story runs entirely in the browser, including when opened as a file. Online maps and optional Google Fonts need internet. If the map cannot load, reconnect or enter coordinates to place your city guess.

## This chapter

Allow roughly 20–30 minutes for discussion, or move quickly for a prototype test:

1. Start with the full five-clue map mystery: place a shared city pin, see your distance and navigation score, then begin the posting.
2. Read the opening brief and three source documents.
3. Handle a diplomatic reception with three approaches.
4. Pursue two of four investigative leads. Earlier choices change your access.
5. Distinguish documented facts, plausible reports, and unverified claims.
6. Draft a short cable and select an attribution and policy recommendation.
7. Read the president’s response and handle a late-night development.
8. See one of four endings and discuss the evening at the residence.

Four visible meters track presidential confidence, host-country trust, allied confidence, and escalation. Choices change meters, documents, reactions and the ending. The decision log explains actual changes. The debrief discloses ending thresholds for feedback and tuning; these are game rules, not a realistic foreign-policy model.

The setting is historical; the crisis, researchers, officials, dialogue and president are fictional. Primary historical references are available in the end-of-chapter debrief. The China campaign is not implemented, to preserve its surprise.

## AI status

**There is no AI API or backend in this version.** The advisers and president use deterministic branching rules. Review evaluates evidence classifications, the explicit attribution choice, and the selected policy. The prose is saved for discussion but is not semantically evaluated or graded. The interface states this at the briefing form and response.

A future AI version needs a server-side endpoint to keep its API key secret. Never put an API key in these static files. GitHub Pages can still host the front end while a separate service handles AI requests.

## Saving and privacy

Progress, briefing drafts and residence notes auto-save to `localStorage` in this browser and site address. Reload to resume. Clearing browser data removes them. A failed save shows a visible message, and the story remains playable in memory.

The final screens can export the full chapter as JSON, including your writing, choices and notes. Import is not implemented. **New posting** replaces only this campaign’s save after an in-app confirmation. It does not delete original-game postcards. There is no analytics, account, sync, or server-side storage; external fonts and map providers receive normal asset requests.

## Original prototype

`classic.html` preserves the original city-map / off-duty prediction game for comparison. It still uses `app.js`, `missions.js`, `style.css`, and its original passport storage key. v2 saves separately.

## Publish on GitHub Pages

Push this folder to a GitHub repository. In **Settings → Pages**, choose **Deploy from a branch**, your default branch (usually `main`), and **/ (root)**. No build, packages, API keys, or backend are required. Relative links support GitHub project URLs, and `.nojekyll` keeps it static.

A GitHub remote and deployment must be configured separately. Local Git commits do not publish the game. Do not put personal briefing exports or credentials into the repository.

## Files

- `index.html`: campaign shell.
- `campaign.css`: campaign presentation, using the original design variables in `style.css`.
- `campaign-data.js`: authored evidence, choices, dialogue, historical references.
- `campaign-engine.js`: state, consequences, assessment, and endings; independent of the DOM.
- `campaign.js`: screens, navigation, map, autosave, forms, and exports.
- `tests/campaign.test.cjs`: meaningful branch and state checks.

Run checks with Node.js (no package installation):

```sh
node --test tests/campaign.test.cjs
node --check campaign.js
```

Tests exercise access differences, the investigation budget, successful and escalatory routes, duplicate-review protection, and all 648 combinations of major choices with supported/unsupported assessments. Browser testing uses `?playtest=1` for a separate save, so the regular player’s chapter stays untouched.
