# Customs Draft

Premium League of Legends custom game drafting for a fixed friend group.

Esports-grade 5v5 team generation with role-aware balancing, random modes, and a Clash-inspired draft reveal.

## Features

- **Tonight's Lobby** : Select exactly 10 players from the hardcoded roster
- **Competitive** : Fairest teams via role preference + MMR balancing
- **Role Consider** : Random teams that still respect playable roles
- **Normal** : Anyone anywhere; no roles, MMR, or tier fairness
- **Draft Reveal** : Framer Motion esports reveal sequence
- **Tier List** (`/tierlist`) : Role-specific drag-and-drop ratings (localStorage)
- **History** (`/history`) : Saved drafts with copy + regenerate
- **Stats** (`/stats`) : Per-player analytics from draft history
- **Discord Copy** : Formatted team paste for Discord

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Lucide Icons
- @dnd-kit (tier list)
- LocalStorage persistence
- Dark mode only — no backend, auth, or database

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |

## Player Data

Edit the roster in [`src/data/players.ts`](src/data/players.ts).

```ts
{
  id: "tom",
  name: "Tom",
  primaryRoles: ["top"],
  secondaryRoles: ["jungle"],
  ratings: {
    top: "S",
    jungle: "B",
    mid: "F",
    // missing roles = unavailable
  }
}
```

## Rating System

| Tier | MMR |
| --- | --- |
| S | 10 |
| A | 8 |
| B | 6 |
| C | 4 |
| D | 2 |
| F | 1 |

Role assignment uses the rating for the **assigned** role. Autofill applies a strength penalty. Secondary roles are slightly discounted.

Tier list edits on `/tierlist` override defaults via localStorage and feed the draft algorithms.

## Draft Modes

### Competitive

Searches hundreds of team partitions, assigns roles with primary → secondary → autofill preference, and minimizes MMR difference + autofill count.

### Role Consider

Randomly splits players into teams, but still assigns roles with playable-role preference.

### Normal

Pure random teams and roles. Ignores role prefs, MMR, and tiers entirely — just who plays where.

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Enter` | Generate teams (lobby, 10 selected) |
| `Space` | Reroll (after reveal) |

## Deploy to Vercel

```bash
npx vercel
```

Or connect the GitHub repo in the Vercel dashboard. No environment variables required.

## Project Structure

```
src/
  app/                 # Routes: /, /tierlist, /history, /stats
  components/
    lobby/             # Player selection + mode select
    draft/             # Reveal animation + team panels
    tierlist/          # Drag-and-drop tier editor
    history/           # Draft history UI
    stats/             # Analytics UI
    ui/                # Buttons, cards, badges, avatars
  data/players.ts      # Hardcoded roster
  hooks/               # Ratings, history, keyboard
  lib/
    draft.ts           # Role assignment + team generation
    ratings.ts         # MMR / preference helpers
    discord.ts         # Discord copy format
    storage.ts         # LocalStorage helpers
    types.ts           # Shared types
```

## License

Private friend-group tool. Not affiliated with Riot Games.
