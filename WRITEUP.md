# yumyum.io: Technical History and Engineering Write-up

*As of October 4, 2026*

This document covers how yumyum.io was built, what went wrong along the way, how those problems were found and fixed, and the reasoning behind the main technical decisions. For how to play or run the project, see the [README](README.md).

## Contents

1. [Overview](#overview)
2. [Project history](#project-history)
3. [Tech stack](#tech-stack)
4. [Architecture](#architecture)
5. [Problems found and how they were fixed](#problems-found-and-how-they-were-fixed)
6. [Performance work](#performance-work)
7. [Security and data integrity](#security-and-data-integrity)
8. [Infrastructure and deployment decisions](#infrastructure-and-deployment-decisions)
9. [Testing and verification](#testing-and-verification)
10. [Known limitations and future work](#known-limitations-and-future-work)

## Overview

yumyum.io is a single-player action RPG that runs entirely in the browser, live at [yumyum-io.vercel.app](https://yumyum-io.vercel.app). Players pick one of three classes and fight outward from a safe village. The world is 18,000 × 18,000 units and holds up to 1,750 enemies. Players collect and craft gear across six rarity tiers and take on bosses in the four corners. Characters are saved to Supabase for signed-in players, or to the browser for guests.

The project has 94 commits over eleven months, in four phases:

1. **Prototype (November 2025).** The game was generated and iterated in Google AI Studio: 79 commits in 19 days, 64 of them on November 20 and 21 alone.
2. **Multiplayer attempt (November 2025).** A Node.js and Socket.IO server grew to about 980 lines, with shared enemies, parties and trading, hosted on Render.
3. **Single-player pivot (January 2026).** Online mode was removed and the game went back to running in the browser. The refactor that did this also deleted several working features without anyone noticing.
4. **Public-release overhaul (October 2026).** The repository was audited and cleaned up for a public portfolio. Lost features were restored and around 25 bugs were fixed. The build and dependencies were modernized, and hosting was rebuilt around a static deployment with no server to pay for.

## Project history

The game went from a blank AI Studio project to a full RPG in three weeks. It then sat idle for eight months after a rushed single-player pivot, and was rebuilt for public release in October 2026.

### Phase 1: AI Studio prototype (November 4 to 5, 2025)

The project started in Google AI Studio as a React and TypeScript canvas game "similar to Hordes.io". The first two days produced the core: a player, enemies, crafting, NPC menus and a developer mode guarded by a hard-coded password. Sign-in was simulated: any email address created a local "session" in `localStorage`.

On November 5 the first multiplayer step landed: an Express and Socket.IO server that took WASD input from each client and broadcast every player's position at 60 Hz. To make room for it, the single-player game loop in `Game.tsx` was commented out as "Phase 1". For the next two weeks the client only drew a grid and the other players' dots, with no enemies, skills or loot.

### Phase 2: features and the multiplayer server (November 19 to 22, 2025)

The busiest stretch of the project was 72 commits over four days. Most of the game's content arrived here:

- **Supabase** replaced the simulated login with real Google sign-in and a `characters` table (November 20).
- **World systems:** boss zones, a bank, fast travel waypoints, a second world (The Grove), an enemy tooltip, and a world expanded to 18,000 units square.
- **Server-side multiplayer:** server-owned enemies, kill and loot events, parties, player-to-player trading, an admin server lock, three difficulty modes (Insane halved player stats), and loot split by each player's share of the damage dealt.
- **Anti-exploit work:** base stats recomputed from level on load, so edited saves couldn't inflate damage or health.
- **Mobile:** a virtual joystick and touch-friendly UI.

By the end the server file had grown to about 980 lines and ran on Render. Running authoritative multiplayer meant the client and server both simulated enemies, and several commits went into reconciling positions that drifted apart.

### Phase 3: single-player pivot (January 27 to 28, 2026)

Two months later, 13 commits removed online mode and made the game fully single-player again. The key refactor (commit `3cfb05c`) rewrote 695 lines of `Game.tsx`. A follow-up (`71c7cca`) moved the game loop's state out of React state and into refs for performance. Interest zones with their own monsters and weather were added at the same time.

The pivot worked for the core loop, but it silently dropped six features:

- setting the safe-zone flag
- spawning bosses
- discovering waypoints
- opening fast travel
- applying enemy projectile hits
- dropping items that no longer fit in the inventory

Nothing failed to compile, because the methods those features used still existed. Nothing called them any more.

### Idle period (February to September 2026)

The game stayed deployed but was not reliably playable. The Vercel domain `yumyum.io.vercel.app` could not get an HTTPS certificate. The Render server kept running for a client that no longer connected to it. The GitHub repository was private.

### Phase 4: public-release overhaul (October 3 to 4, 2026)

The goal was to make the repository public and the game playable for a portfolio.

The work began with a false start. The local project folder was not a git repository but an outdated snapshot from November 5, frozen partway through the multiplayer change. It also held a few unsuccessful edits from an attempt to get the server running. The first assessment was made against that snapshot. Pulling the real repository from GitHub showed the game was 85 commits further along. That assessment was thrown out and the real code was audited instead.

The overhaul landed as two commits:

- `b2b7864`, "Prepare repo for public release": 67 files, about 5,800 lines added and 2,800 removed.
- `1dc29df`: guest mode, the license note, and deployment changes.

| Date | Milestone |
| --- | --- |
| 2026-10-04 | Guest play, Supabase keep-alive job and license note shipped |
| 2026-10-03 | Overhaul committed; new domain `yumyum-io.vercel.app`; sign-in redirect fixed; Render service deleted |
| 2026-01-28 | Game loop state moved into refs; interest zones added |
| 2026-01-27 | Online mode removed (`3cfb05c`) |
| 2025-11-22 | Virtual joystick; world expanded to 18,000 units |
| 2025-11-21 | Multi-world support, difficulty modes, name uniqueness, exploit fixes |
| 2025-11-20 | Supabase auth and storage; parties, trading, bank |
| 2025-11-19 | Boss zones; fast travel and online-mode placeholder |
| 2025-11-05 | First multiplayer server; single-player loop commented out |
| 2025-11-04 | Project created in Google AI Studio |

## Tech stack

The stack is a static React app plus managed services, chosen so the game has no server to maintain and fits within free hosting tiers.

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript 5.9, strict mode | Catches the class of bug where an entity or save field changes shape. `noUnusedLocals` is on, which is how the leftover multiplayer code became visible. |
| UI | React 18.3 | Menus, the HUD, inventory and shops are forms and lists, which React handles well. React never renders the game world itself. |
| Game rendering | HTML Canvas 2D | Hundreds of moving enemies, projectiles and particles are redrawn every frame. Each as a DOM element would mean thousands of layout updates per frame. |
| Build tool | Vite 6 | Fast dev server and production builds. Upgraded from Vite 4, which is end-of-life and has known dev-server security advisories. |
| Styling | Tailwind CSS 4, bundled at build time | Utility classes match the prototype's styling. Previously loaded as the Tailwind CDN script, which generates CSS in the browser at runtime and is meant only for prototyping. |
| Auth and database | Supabase (Postgres, Google OAuth, row-level security) | Real accounts and saving without writing a backend. The browser talks to Postgres directly, and access is enforced by row-level security policies inside the database. |
| Guest saves | Browser `localStorage` | Lets visitors play with no account and no server cost. |
| Hosting | Vercel (static site plus one serverless function) | Free tier, deploys on every push to `main`, and supports scheduled cron functions. |
| Linting | ESLint 9 with typescript-eslint and the React Hooks rules | The repo shipped a `lint` script with no config file, so it had never actually run. |

### What was removed

Express, Socket.IO, `tsx`, `ts-node` and the Render web service all went. The game is single-player, so a long-running server only added monthly cost and a second deployment to keep working. The Google Gemini API-key setup from the AI Studio template was removed too, since nothing used it.

### Upgrades deliberately not taken

React 19, TypeScript 7 (the rewrite of the compiler in Go) and Vite 8 were all available. Each is a migration with its own breaking changes. Folding three of those into a cleanup would have made any new bug hard to trace back to its cause. Vite 6 was the newest version that works with both the existing React plugin (4.7) and the project's Node 20+ requirement.

## Architecture

The app has two layers. React owns the screens and menus. A canvas game engine, running in a requestAnimationFrame loop, owns the world. They meet in `components/Game.tsx`.

```
Browser
├── App.tsx ─────────── screen flow + session (account or guest)
│   ├── LoginScreen       Google sign-in or "Play as Guest"
│   ├── CharacterSelect   up to 3 heroes, DEV badge for dev characters
│   ├── CharacterCreation name + class, live name check
│   ├── Game.tsx ──────── game engine host (canvas + HUD + windows)
│   │   ├── fixed 60 Hz simulation  → game/entities/*, game/spawning.ts
│   │   ├── canvas renderer         → culled, one draw per display frame
│   │   └── React overlays          → HUD, inventory, shops, fast travel
│   └── DeathScreen
│
├── services/storage.ts ────── CharacterStore → Supabase (signed in)
├── services/guestStorage.ts ─ CharacterStore → localStorage (guest)
└── services/auth.ts ───────── Supabase Google OAuth

Supabase: Postgres `characters` table, row-level security, is_dev trigger
Vercel:   static build + api/keep-alive.js (daily cron)
```

### Screen flow and sessions

`App.tsx` is a small state machine: `login → char_select → char_create → in_game → dead`.

A session is either a signed-in Supabase user or a guest. Both are represented as an `AuthUser`, and guests have `isGuest: true`. The app picks a `CharacterStore` from the session type. `CharacterStore` is an interface with five methods (load, save, create, delete, and check name), and it has two implementations: Supabase and `localStorage`. Everything above the store is the same for both kinds of player.

### The game engine

`Game.tsx` keeps the world in refs rather than React state, so a frame never triggers a React render.

- **Player:** created once per session with `useState(() => new Player(data))`.
- **Entities:** enemies, projectiles, floating text, visual effects, ground effects, dropped items, NPCs and waypoints live in `entitiesRef`.
- **Shared context:** a `GameContext` object hands entities and skills the player, the enemy list and functions to spawn things. Its `enemies` field is a getter, because the loop replaces that array every step when it removes dead enemies.
- **UI refresh:** React re-renders the HUD 10 times a second, driven by a counter the loop increments. Player actions (equipping, buying, selling) refresh it immediately.

Each simulation step runs in this order:

1. Spawning (a new enemy pack every 20 steps up to the cap, a boss every three minutes up to two at once) and autosave every 3,600 steps (one minute).
2. Safe-zone check, then player movement and status effects.
3. Waypoint discovery.
4. Enemy AI, only for enemies that are engaged or within 2,500 units of the player.
5. Projectiles, dropped items, floating text, visual effects and ground effects.
6. Collisions: hostile projectiles against the player, player projectiles against nearby enemies.
7. Kills: XP, gold and loot drops. Then item pickup.
8. Cleanup of dead and expired entities, the death check, and the camera following the player.

### Entities and game rules

All entities are plain TypeScript classes in `game/entities/`.

- **`Character`** is the abstract base. It holds position, health, a shield, invulnerability frames, hit-flash and animation state, and status effects: `dot`, `slow`, `stun`, `shield`, `haste`, `empowered` and `whirlwind_active`.
- **`Player`** derives final stats from level plus equipment through `calculateFinalStats`. It has 50 inventory slots plus up to 25 more from bags, 100 bank slots and five class skills.
- **`Enemy`** is a state machine: `idle → chasing → attacking → returning`. It has aggro and leash ranges (180 and 300 units, doubled for bosses), and gives up the chase when the player enters the safe zone or a boss zone. Each of the four bosses has its own special attack built from ground effects.
- **`Projectile`**, **`GroundEffect`**, **`VisualEffect`**, **`DroppedItem`** (pulled toward the player within 200 units), **`NPC`**, **`Waypoint`** and **`FloatingText`** cover the rest.

Content is data-driven, in `game/constants.ts` and `game/items.ts`:

- **Enemies:** 8 world-one enemy types (4 of them interest-zone specials), 4 for The Grove, and 8 bosses.
- **Places:** 4 interest zones, 9 waypoints and 4 boss zones.
- **Items:** about 30 equipment items and 16 crafting recipes.

**Level scaling.** Enemy level grows with distance from the village, from 1 at its edge to 45 at the world's edge. Interest-zone monsters are multiplied up to level 50.

**Experience curve:**
- Levels 1 to 10 need 50 × level^1.5 XP.
- Levels 11 to 30 each need 1.2 × the previous level's requirement + 500.
- Levels 31 to 45 each need 1.35 × the previous + 5,000.

**Loot.** Equipment drops 10% of the time, plus 0.1% per enemy level. Materials drop 40% of the time, plus 0.2% per level. Both are multiplied by the player's item-find stat. Rarer tiers are gated by enemy level: Rare from level 5, Epic from 15, Legendary from 30. Bosses always drop gear, roll 11 times, and have a 1% chance at a Mythic item.

### Saving

Signed-in characters are stored one row each in a Supabase `characters` table. Columns hold the level, XP, gold and kills. JSON columns hold the stats, inventory and equipment, and bank contents live inside the stats JSON for historical reasons. Guest characters are the same objects in `localStorage`.

Saves happen:
- on autosave, once a minute;
- after every inventory, shop or bank action;
- when a waypoint is discovered;
- when the tab is hidden or closed (best effort);
- on leaving the world, dying, or travelling to the other world.

## Problems found and how they were fixed

The audit found about 25 bugs. The largest group was the six features lost in the January pivot. The rest were in the game loop, input handling, saving and sign-in, mobile layout, and deployment.

### Features lost in the single-player pivot

Each was restored by putting the call back into the new game loop, using the January 26 version of `Game.tsx` from git history as the reference.

| Problem | Effect on players | Fix |
| --- | --- | --- |
| `player.isInSafeZone` was never set | Enemies followed players into the village. Safe-zone healing (5× regeneration plus 10 HP per second) never applied. | Set every step from the distance to the world center. |
| No boss spawning | Boss zones were empty. The boss item-find bonus and Mythic drops were unreachable. | A new `createBoss` in `game/spawning.ts`: one boss at start, then every three minutes up to two at a time, World 2 using its own boss types. |
| Waypoints never discovered, fast travel unreachable | The fast-travel window existed but nothing opened it. | Discovery when within 150 units, a save on discovery, and E or a tap on a discovered waypoint opens fast travel. |
| Enemy projectiles never hit the player | Ranged enemies (Vengeful Dryad) and the Broodmother and Void Weaver bosses could not hurt the player with their normal attacks. | The collision pass checks hostile projectiles against the player. |
| Items lost when a bag was unequipped | Removing a bag shrinks the inventory. Items in the removed slots went into an `overflowItems` list nothing read, then vanished on the next save. | Displaced items now move into free slots first; anything that still doesn't fit is dropped on the ground next to the player. |
| No way to talk to NPCs on touch screens | The only trigger was the E key. | An on-screen "Talk to …" or "Fast travel from …" button above the player, for touch and mouse. |

### Game loop

- **Game speed tied to the monitor's refresh rate.** Movement and many timers advanced a fixed amount per animation frame, so on a 144 Hz display the whole game ran 2.4 times faster than on a 60 Hz one. The loop now uses a fixed-timestep accumulator. Time between display frames is collected, the simulation advances in fixed 1/60-second steps, and drawing happens once per display frame. Gaps are capped at 250 ms and at most 5 steps run per frame, so a backgrounded tab doesn't fast-forward the world when it returns. In browser tests, holding W for one second moved the player 248 pixels at 60 Hz and 244 at an emulated 144 Hz.
- **Arcane Barrage never bounced.** The Mage's level-41 skill fires seeking missiles that should bounce once. `onHit` used up the bounce and redirected the missile, and then the collision loop saw zero bounces left and destroyed it immediately. The loop now checks for a remaining bounce before the hit and skips enemies the missile has already hit.
- **A "flash before removal" check that never worked.** Dead enemies were kept while `Date.now() - hitFlashTimer < 100`. But `hitFlashTimer` counts frames from 8 down to 0, not milliseconds, so the condition was always false. It was replaced with a plain filter.
- **The canvas was resized every frame.** Setting `canvas.width` clears the canvas and allocates a new buffer. It now only happens when the window size actually changes.

### Input

- **Hotkeys fired while typing.** Keys like E, I, C, Q and 1–5 triggered game actions even inside text boxes. Key handling now ignores events from inputs and from Ctrl, Alt or Cmd combinations.
- **Holding a toggle key made windows flicker.** Auto-repeat re-fired the inventory and stats toggles. Repeated key events are now ignored for toggles.
- **Stuck movement after switching windows.** A key released while the window is unfocused never fires `keyup`, so the player kept walking. Held keys are now cleared on `blur`.
- **Q quit the game.** Q sits next to WASD and saved and left the world instantly. It was replaced with a Leave button in the HUD.
- **Non-QWERTY keyboards.** Movement now reads `KeyboardEvent.code`, the physical key position, so WASD works on AZERTY and other layouts. Arrow keys were added.

### Saving, sign-in and sessions

- **Kicked back to the menu mid-game.** Supabase re-sends the signed-in user when it refreshes the access token (about hourly) and when the tab regains focus. The app treated every event as a new login and reset to character select, losing unsaved progress. It now compares user IDs and ignores events for the same user.
- **Possible auth deadlock.** Supabase holds a lock while its auth listener runs, and the app queried the database from inside that listener. The listener now defers its work to the next tick.
- **Dropped saves.** A save was skipped if another had started within the previous two seconds. It also read an outdated copy of its "is saving" flag from the first render. Saves now queue: a request made while one is in flight runs again when it finishes.
- **A late save overwriting newer data.** An in-flight autosave could land after the final save made on leaving. The game now waits for the in-flight save before handing the character back.
- **Instant death loop.** Dying saved the character at 0 HP. If the player picked "Return to Menu" and then "Adventure", the game started at 0 HP and immediately showed the death screen again. The 30% gold penalty is now applied once, at the moment of death, and the character is saved already respawned. Old characters saved at 0 HP are respawned when selected.
- **Stale character list.** The menu showed the list loaded at sign-in. Re-entering a character could load progress from before the last session, and the next autosave would write that older data over the newer save. The local list is now updated on every save.
- **World travel dropped players at the menu.** Travelling to The Grove reloaded the whole page. App now saves and remounts the game with the new world.
- **False "name taken" results.** The name check used a case-insensitive SQL `ILIKE` match, so names containing `%`, `_` or `*` acted as wildcards. Those characters are now replaced with single-character wildcards, and results are compared exactly.

### Mobile and layout

- **No joystick on landscape phones.** The joystick was hidden at 768 px wide and above, and most phones held sideways are wider than that. It now shows on any touch device (the CSS media query `pointer: coarse`).
- **No way to leave or see stats on touch.** Leave and Stats buttons were added to the HUD.
- **Menus cut off on small screens.** Character select and creation couldn't scroll. The menu layout now scrolls while staying centered when there's room.
- **Shop windows under the skill bar.** The crafting and material shop windows had no z-index.
- **HUD overlap on short screens.** On landscape phones the action buttons overlapped the minimap. A custom Tailwind `short` variant (max-height 500 px) shrinks the minimap, the action buttons sit in a row, and the stats panel starts closed.
- **Smaller fixes:**
  - The web app manifest wasn't in the build output, because it sat outside `public/`.
  - The merchant's bulk-sell hint described the wrong click.
  - The character creation cards built Tailwind class names at runtime. That only worked because the CDN script generates CSS live, and it would have broken once styles were bundled.

### Deployment and sign-in

- **The live domain had no valid HTTPS certificate.** `yumyum.io.vercel.app` puts a dot inside the subdomain. Vercel's wildcard certificate `*.vercel.app` only covers one level, so browsers refused the connection. The project moved to `yumyum-io.vercel.app`.
- **Sign-in sent players to a 404 page.** After the domain change, Supabase redirected players to the Site URL in its auth settings, which was still an old address. Setting the Site URL and allowed redirect URLs to the new domain fixed it.
- **The Render deploy failed.** Removing `server.ts` and the `start` script broke Render's automatic deploy from `main`. The service was deleted instead of repaired; see [Infrastructure and deployment decisions](#infrastructure-and-deployment-decisions).
- **An automated upgrade tool broke an event listener.** Tailwind's official v3-to-v4 upgrade tool rewrote the string `'blur'` in `removeEventListener('blur', …)` to `'blur-sm'`, treating it as a class name. That would have stopped the listener from ever being removed. It was caught by diffing every change the tool made against a snapshot taken before it ran.

## Performance work

The heaviest cost was drawing and updating the whole world every frame, whether or not any of it was on screen.

- **Off-screen culling.** Enemies, items, effects, projectiles, waypoints and zones are drawn only if they're within the viewport plus a 250-unit margin. With up to 1,750 enemies spread over 324 million square units, a typical screen shows a small fraction of them. Each enemy's name and level label uses a canvas text shadow, which is expensive to draw.
- **Skipping far-away enemies.** Idle enemies more than 2,500 units from the player are not updated, and they resume wandering when the player comes near. Enemies that are chasing or walking home always update, so none freeze mid-fight. Projectile collision checks use only the nearby, active enemies, instead of every enemy for every projectile.
- **One path for the grid.** The background grid used to be about 240 separate full-world lines per frame. It's now only the visible lines, stroked as a single path.
- **Bundled CSS.** The Tailwind CDN script generated styles in the browser on every page load. The build now ships a 65 KB stylesheet, 11 KB gzipped.
- **Vendor chunks.** React (142 KB) and the Supabase client (227 KB) are split from the game code (148 KB) into their own files, so browsers keep them cached when only the game changes.

## Security and data integrity

The browser talks to Supabase directly with a public key, so all access control lives in the database.

### Keys and configuration

- The Supabase URL and public "anon" key were hard-coded in the source. They now come from the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, documented in `.env.example`.
- The anon key is designed to be public, and it's still in older commits. Decoding its token confirmed its role is `anon`, not the all-powerful `service_role`. A scan of the full git history found no other secrets before the repository was made public.

### Row-level security

The `characters` table has row-level security turned on, with four policies that each require `auth.uid() = user_id`. A player can only read, create, update or delete their own characters. A unique index on `lower(name)` makes character names unique across all players, ignoring case.

### Dev characters: four designs in one project

Developer tools grant max level, gold and top-tier items for testing. How they were protected changed four times:

1. **Hard-coded password** (November 2025). The password `gabs` sat in the client source, so anyone could read it.
2. **A `localStorage` flag** (January 2026). Anyone could set it from the browser console.
3. **An account flag** (October 2026, short-lived). A `profiles` table had an `is_dev` column. Players could read only their own row, and no rule let anyone write to it from the game.
4. **A per-character flag** (current). An `is_dev` column on `characters`, at the owner's request.

Option 4 needed extra protection. Players are allowed to update their own character rows, so they could have set `is_dev` themselves. Two layers prevent that:

- The game never writes `is_dev`.
- A Postgres trigger checks the database role a request runs as. Requests from the game run as `anon` or `authenticated`; for those, the trigger forces `is_dev` to false on new rows and keeps the old value on updates. The dashboard runs as a different role, so only the owner can change the flag.

The trigger was tested against a real Postgres engine before it was published (see [Testing and verification](#testing-and-verification)). Guest characters can never be dev characters.

### What this does not protect against

The game is client-authoritative: the browser runs the simulation and saves the result. A player with some technical knowledge can still write any level, gold or items to their own characters through the API. Stopping that would mean validating changes on a server or in database functions, which is out of scope for a single-player game. The current protections keep testing tools away from players and keep each player's data private, which is what matters for a single-player game.

## Infrastructure and deployment decisions

Each infrastructure choice traded a little capability for less cost and less upkeep.

- **Removing the Render server.** The multiplayer server cost money every month to host. It had also been unused since January, because the client no longer connected to it. After the cleanup removed its code, its next automatic deploy failed. Repairing a paid service for a feature that didn't exist made no sense, so it was deleted. The code remains in git history (commit `0150731`) if multiplayer comes back.
- **Moving to `yumyum-io.vercel.app`.** The only fix for the certificate problem was a subdomain without an inner dot.
- **Environment variables baked in at build time.** Vite replaces `import.meta.env.*` while building, so the Supabase values had to be added in Vercel before the new code was deployed. A missing value shows a "Supabase is not configured" screen rather than a crash.
- **Keeping Supabase awake.** Supabase pauses free-tier projects after about a week without activity. Sign-in would then fail for anyone opening the game from a portfolio link. A Vercel cron job (`vercel.json`) calls `api/keep-alive.js` once a day, and that function makes one small Supabase query. Vercel was chosen over a scheduled GitHub Actions workflow because GitHub turns off scheduled workflows in repositories with no commits for 60 days, which a finished portfolio project can easily reach.
- **Guest play.** Requiring a Google account is a barrier for someone clicking through a portfolio. Guests can now play straight away, with heroes saved in their browser. Signing in afterwards switches to the account's heroes; guest heroes stay in that browser.
- **No license.** The repository is public so people can read the code, but no license is granted, so all rights are reserved. The README says so explicitly.

## Testing and verification

The project has no permanent automated test suite. Each change in the overhaul was checked in four ways:

- **Static checks.** `tsc` (strict), ESLint and a production build ran after every batch of edits, and `npm audit` reports no vulnerabilities.
- **Browser tests.** Playwright drove the Microsoft Edge already installed on the machine, in headless mode. Real Google sign-in can't be automated, so a temporary page mounted the real `App` or `Game` with sign-in and saving replaced by fakes. Recording hooks attached to the `Player` class exposed the game's internal state to the tests. 75 checks in four runs covered:
  - movement at 60 Hz and at an emulated 144 Hz;
  - boss spawning, enemy projectile damage, the safe zone and released keys;
  - NPC windows and fast travel;
  - bag overflow;
  - death and respawn, leaving, and world travel;
  - token refreshes not interrupting play;
  - the landscape phone layout;
  - dev characters;
  - the full guest flow.

  Screenshots of every screen were reviewed for layout. The test page was deleted before each commit.
- **Database tests.** The `is_dev` trigger was run in PGlite, a build of Postgres that runs inside Node.js. The tests created the same roles Supabase uses and passed 6 checks: game requests could not set, change or clear the flag; normal saves kept it; the dashboard role could change it.
- **Live checks after deploy.** These confirmed:
  - The live JavaScript contained the Supabase URL.
  - Supabase's sign-in endpoint redirected to Google.
  - The keep-alive endpoint returned a successful response.
  - The `characters` table had every column the code reads and writes.

  None of these signed anyone in or changed any data.

One test run failed, and the bug was in the test: reloading the page also reset the fake database. Rewriting that check confirmed the app behaved correctly.

## Known limitations and future work

- **Client-authoritative saves.** Determined players can edit their own characters (see [Security and data integrity](#security-and-data-integrity)).
- **The name check only sees your own characters.** Row-level security hides other players' rows, so the live check while typing can't catch every taken name. The unique index catches the rest when the character is saved.
- **Guest heroes stay in the browser.** They can't be moved into an account yet.
- **Interest-zone drop bonus.** Each zone defines a `dropBonus` that nothing uses yet.
- **No sound.** The engine has a `playSound` hook that does nothing.
- **No permanent test suite.** The browser and database tests used in the overhaul could be turned into a checked-in Playwright suite that runs on every push.
- **Deferred upgrades.** React 19, TypeScript 7 and Vite 8 are each worth a separate, focused upgrade.
- **Multiplayer.** Bringing it back would mean a server that owns the simulation, and a monthly hosting cost to match.
