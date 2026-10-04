# yumyum.io

A browser-based action RPG inspired by [Hordes.io](https://hordes.io). Pick a class, fight your way out from the village through packs of monsters, collect and craft gear, and take on the bosses waiting in the corners of the world.

**Play it at [yumyum-io.vercel.app](https://yumyum-io.vercel.app).** It runs in any modern desktop or mobile browser. Play as a guest to jump straight in, or sign in with Google to keep your heroes on your account.

## Features

- **Three classes** (Warrior, Mage and Archer), each with five skills that unlock as you level up to 45.
- **A large open world** where monsters get tougher the further you travel from the village. Four themed zones have their own monsters and weather.
- **Bosses** that spawn in the four corner boss zones. Regular monsters can't follow you into boss zones, and you find more items while you're inside one.
- **Loot and crafting**: equipment from Common to Mythic, crafting materials, and a crafter who turns materials into gear.
- **Village services**: a merchant, a material seller, a vault for extra storage and gold, and a traveler who takes you to a second, harder world, The Grove.
- **Waypoints** you discover while exploring and can fast travel between.
- **Mobile support** with a virtual joystick and touch controls.
- **Guest play**: no account needed. Guest heroes are saved in the browser; sign in with Google to keep heroes on your account across devices.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Move | `W` `A` `S` `D` or arrow keys | Virtual joystick |
| Use skills | `1` to `5` | Tap the skill bar |
| Talk to an NPC or use a waypoint | `E` | Tap the prompt |
| Inventory | `I` | Backpack button |
| Hero stats | `C` | Stats button |
| Close windows | `Esc` | Tap outside the window |
| Save and leave the world | Leave button | Leave button |

In your inventory, tap an item to equip it and tap a gear slot to unequip it. Lock mode protects items from being sold. At the merchant, Shift + right-click sells a whole stack, or every unlocked item of that rarity.

Dying returns you to the village and costs 30% of the gold you're carrying. Gold in the vault is safe.

## Classes

| Level | Warrior | Mage | Archer |
| --- | --- | --- | --- |
| 1 | Whirlwind | Fireball | Rain of Arrows |
| 11 | Charge | Frost Nova | Multishot |
| 21 | Iron Skin | Blink | Sprint |
| 31 | War Cry | Lightning Bolt | Power Shot |
| 41 | Berserker Rage | Arcane Barrage | Arrow Storm |

## Tech stack

- [React 18](https://react.dev) and TypeScript for the UI, with the game world drawn on an HTML canvas
- [Vite](https://vite.dev) for development and builds
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Supabase](https://supabase.com) for Google sign-in and saving characters (guest heroes use the browser's local storage instead)
- Hosted on [Vercel](https://vercel.com)

The game runs entirely in the browser. The simulation advances in fixed 60 Hz steps, so it plays at the same speed on any refresh rate.

## Running locally

You need [Node.js](https://nodejs.org) 20 or newer and a Supabase project (the free tier is enough).

1. Clone the repo and install dependencies:

   ```sh
   git clone https://github.com/rchamp25/yumyum.io.git
   cd yumyum.io
   npm install
   ```

2. Set up Supabase as described in [Supabase setup](#supabase-setup) below.

3. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key. You can find both in the Supabase dashboard under **Project Settings > API**.

   ```sh
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Start the dev server and open [http://localhost:3000](http://localhost:3000):

   ```sh
   npm run dev
   ```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server on port 3000 |
| `npm run build` | Type-checks and builds the production site into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run typecheck` | Runs the TypeScript compiler without building |
| `npm run lint` | Runs ESLint |

### Dev characters

A character with `is_dev` set in the database gets max level, lots of gold and top-tier items the first time it's played, which is handy for testing. Dev characters show a **DEV** badge on the character select screen.

To make one, create the character in the game, then flag it in the Supabase SQL editor (or tick `is_dev` in the Table Editor):

```sql
update public.characters set is_dev = true where name = 'YourCharacter';
```

The rewards are granted once. To grant them again, set `has_claimed_dev_rewards` back to `false`.

The game can't set or change `is_dev` itself (see [Characters table](#characters-table)), so only someone with access to the Supabase dashboard can create dev characters.

## Project structure

```
├── App.tsx              Screen flow: login, character select, game, death
├── index.tsx            Entry point
├── components/          React UI: the game canvas and loop (Game.tsx), HUD, inventory, shops and menus
├── game/
│   ├── entities/        Player, enemies, NPCs, projectiles, effects and dropped items
│   ├── constants.ts     World layout, enemy and boss definitions, loot tables, XP curve
│   ├── items.ts         Equipment, materials and crafting recipes
│   ├── skills.ts        Class skills
│   ├── spawning.ts      Enemy pack and boss spawning
│   ├── lootUtils.ts     Loot drops
│   └── stats.ts         Final stat calculation from gear and location
├── services/            Supabase client, auth, and character storage (Supabase and guest)
├── api/                 Vercel serverless function for the Supabase keep-alive cron job
└── public/              Static files (favicon, web app manifest)
```

## License

Copyright (c) 2026 rchamp25. All rights reserved.

This repository is public so you can read the code and see how the game works, but no license is granted. You may not copy, modify, distribute or reuse the code or assets without written permission.
