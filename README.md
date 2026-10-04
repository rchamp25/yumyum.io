# yumyum.io

A browser-based action RPG inspired by [Hordes.io](https://hordes.io). Pick a class, fight your way out from the village through packs of monsters, collect and craft gear, and take on the bosses waiting in the corners of the world.

**Play it at [yumyum-io.vercel.app](https://yumyum-io.vercel.app).** It runs in any modern desktop or mobile browser. Sign in with Google to keep your heroes between sessions.

## Features

- **Three classes** (Warrior, Mage and Archer), each with five skills that unlock as you level up to 45.
- **A large open world** where monsters get tougher the further you travel from the village. Four themed zones have their own monsters and weather.
- **Bosses** that spawn in the four corner boss zones. Regular monsters can't follow you into boss zones, and you find more items while you're inside one.
- **Loot and crafting**: equipment from Common to Mythic, crafting materials, and a crafter who turns materials into gear.
- **Village services**: a merchant, a material seller, a vault for extra storage and gold, and a traveler who takes you to a second, harder world, The Grove.
- **Waypoints** you discover while exploring and can fast travel between.
- **Mobile support** with a virtual joystick and touch controls.

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
- [Supabase](https://supabase.com) for Google sign-in and saving characters
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

## Supabase setup

### Google sign-in

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), create an OAuth client ID of type **Web application**. Under **Authorized redirect URIs**, add your Supabase callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
2. In Supabase, go to **Authentication > Sign In / Providers > Google**, turn it on, and paste in the client ID and secret.
3. In **Authentication > URL Configuration**, set the **Site URL** to where the game is hosted. Under **Redirect URLs**, add every address the game runs from, for example `http://localhost:3000/**` for local development and `https://your-site.vercel.app/**` for production.

### Characters table

Characters are stored in a single `characters` table. Run this in the Supabase SQL editor to create it with row level security, so each player can only read and change their own characters:

```sql
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  char_class smallint not null,
  level integer not null default 1,
  xp bigint not null default 0,
  gold bigint not null default 0,
  kills integer not null default 0,
  stats jsonb not null,          -- base stats, plus bank, bankGold and currentWorldId
  inventory jsonb not null,
  equipment jsonb not null,
  position jsonb,
  discovered_waypoints jsonb not null default '["wp_spawn"]',
  has_claimed_dev_rewards boolean not null default false,
  is_dev boolean not null default false, -- dev character, set by hand from the dashboard
  created_at timestamptz not null default now()
);

create index characters_user_id_idx on public.characters (user_id);

-- Character names are unique regardless of capitalization
create unique index characters_name_unique_idx on public.characters (lower(name));

alter table public.characters enable row level security;

grant select, insert, update, delete on public.characters to authenticated;

create policy "Players can read their own characters"
  on public.characters for select
  using (auth.uid() = user_id);

create policy "Players can create their own characters"
  on public.characters for insert
  with check (auth.uid() = user_id);

create policy "Players can update their own characters"
  on public.characters for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Players can delete their own characters"
  on public.characters for delete
  using (auth.uid() = user_id);

-- Players may update their own characters, so stop them from flagging their own as dev
-- characters. Requests from the game run as the anon/authenticated roles; for those, is_dev
-- is forced to false on new characters and left unchanged on updates. The dashboard isn't affected.
create or replace function public.protect_character_is_dev()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_dev := false;
    else
      new.is_dev := old.is_dev;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_character_is_dev
  before insert or update on public.characters
  for each row execute function public.protect_character_is_dev();
```

The character creation screen checks whether a name is taken as you type, but with these policies it can only see your own characters. The unique index is what actually stops two players from taking the same name.

The `is_dev` flag only keeps the testing rewards away from regular players. It isn't anti-cheat: characters are saved straight from the browser, so the database accepts whatever a signed-in player sends for the other columns of their own characters.

## Deploying to Vercel

1. Import the repository into Vercel. It detects Vite automatically: the build command is `npm run build` and the output directory is `dist`.
2. Under **Settings > Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are baked in at build time, so redeploy after changing them.
3. Add the deployed URL to the Supabase redirect URLs as described in [Google sign-in](#google-sign-in).

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
├── services/            Supabase client, auth and character storage
└── public/              Static files (favicon, web app manifest)
```
