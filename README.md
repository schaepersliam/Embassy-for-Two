# Embassy for Two

A small evening game for Liam and Addison: follow five clues to a mystery city, place a shared map pin, then plan an imaginary afternoon and predict each other’s choices.

## Play locally

Open `index.html` in a browser. An internet connection loads Leaflet, the map tiles, and optional Google Fonts. No build, account, API key, Python backend, or package installation is needed.

For a local web preview, run this in the project folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open http://127.0.0.1:8000. Python only serves files here; all game logic runs in the browser.

## What this iteration does

- Two curated city missions: an embassy posting in Berlin and a consular posting in Frankfurt am Main. Mission menus hide the answers.
- Five progressively revealing clues, a map without place labels, coordinate entry, and a single shared pin.
- Distance to the city centre, an accuracy score, and an early-solve bonus. Reveal unused clues after scoring without changing the score.
- A sourced debrief and optional conversation prompt.
- Two turn-taking partner choices and predictions, followed by a joint reveal.
- A browser-local passport with optional notes and a JSON download. A stamp is earned by finishing, regardless of score.

One person drives during a call or screen-share. This is **not synchronized multiplayer**: there are no rooms, shared server state, or remote controls. Partner answers require looking away / pausing screen-share and handing control over; both players can also make their selections verbally to the person driving. They are hidden in the interface after each turn, not encrypted. Real private simultaneous answers across two devices need a future multiplayer service.

Passport entries live only in localStorage on that browser and site address. Clearing browser data removes them. Download is a backup/export; importing is not implemented yet. Static source code contains the answers. Don’t inspect it if you want the mystery!

## Publish on GitHub Pages

1. Create an empty GitHub repository (do not add a README there).
2. Commit this folder and push it to the repository’s default branch, usually `main`.
3. In the GitHub repository, open **Settings → Pages**. Choose **Deploy from a branch**, select your default branch and **/ (root)**, and save.
4. GitHub supplies a URL such as `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/` when the deployment finishes.

No workflow or build configuration is required. All asset links are relative so project URLs work. The `.nojekyll` file keeps the deployment static. This folder is a local Git repository; a GitHub remote and public deployment are not created by these files.

GitHub Pages sites are generally public. Source files and clue answers are public when uploaded to a public repository. Personal postcard notes remain in the player’s browser; they are not uploaded to the repository. Maps/fonts contact their providers; this prototype has no analytics.

## Edit the game

- `index.html`: page structure and copy.
- `style.css`: colours, layout, and responsive styling.
- `missions.js`: city coordinates, five clues, sources, and off-duty prompts. Coordinates refer to city centres, not diplomatic buildings. Add missions using the same object shape and update the mission-count text in `index.html`.
- `app.js`: map, scoring, turn-taking, and passport storage.

No content is generated live. Keep dated statistics labelled with their year and verify new clues against primary sources. The name is playful; this game is not affiliated with any government.

## Next iterations

Try the two sample missions on a call, then decide on clue difficulty, world coverage, and whether you want a daily dispatch. Add synchronized rooms only when the basic game feels fun; GitHub Pages can still host the front end if a separate service stores room state.
