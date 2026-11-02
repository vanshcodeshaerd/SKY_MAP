# shadcn/ui-style components (SkyMap AR)

This Vite + React + TypeScript + Tailwind project uses the same conventions as [shadcn/ui](https://ui.shadcn.com):

| Piece | Path |
|--------|------|
| UI components | `src/components/ui/` |
| `cn()` helper | `src/lib/utils.ts` |
| Path alias | `@/*` → `src/*` (see `tsconfig.json` + `vite.config.ts`) |
| Theme tokens | Orbit palette mapped to shadcn names in `tailwind.config.js` (`background`, `card`, `primary`, `muted`, `border`) |

## Adding more shadcn components

From `frontend/`:

```bash
npx shadcn@latest init
```

When prompted, use:

- **Components:** `@/components`
- **Utils:** `@/lib/utils`
- **CSS:** `src/index.css`
- **Tailwind config:** `tailwind.config.js`

Then:

```bash
npx shadcn@latest add button
```

## Installed for bottom nav

- `framer-motion` (animations)
- `lucide-react` (icons, already in project)
- `clsx` + `tailwind-merge` (via `cn()`)

## Usage

Mobile site navigation uses `BottomNavBar` from `@/components/ui/bottom-nav-bar`, wired in `src/components/MobileBottomNav.tsx`.

## Welcome hero

`OrbitalHeroSection` (`@/components/ui/orbital-hero-section.tsx`) drives the landing canvas with helical planet wakes. Textures come from `public/textures/*.jpg` via `src/features/welcome/orbitarium/heroPlanets.ts` (same assets as Orbitarium).
