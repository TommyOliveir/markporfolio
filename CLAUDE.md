# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read [AGENTS.md](AGENTS.md) first: this is Next.js 16, whose APIs differ from older versions. Check
`node_modules/next/dist/docs/` before writing Next-specific code. `next dev` re-adds that file's block,
so leave it in.

## Commands

The system's default Node version is too old: use Node 22 (`nvm use`, from `.nvmrc`). Next 16 and ESLint 9 need it.

```bash
npm run dev           # http://localhost:3000 (allowedDevOrigins in next.config.ts lets a phone on the LAN open it)
npm run build
npm run typecheck     # next typegen && tsc --noEmit
npm run lint          # eslint (flat config, eslint-config-next + prettier)
npm run format        # prettier --write . (120 cols, double quotes, trailing commas)
npm run format:check
node scripts/build-molo-map.mjs   # re-download the Molo map from OpenStreetMap (needs network)
```

There is no test suite. CI (`.github/workflows/ci.yml`) runs format:check, lint, typecheck, then build.
The husky pre-commit hook runs typecheck and lint.

Env vars (see `.env.example`): `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`,
`NEXT_PUBLIC_SITE_URL`. Deployed on Vercel.

## Rule: every UI fix covers desktop and mobile

When you change or fix anything visual on desktop, make the matching change for mobile in the same
task, and the other way round. A fix that only works at one size isn't done.

- Check every layout you touch at phone width (~390px) and at desktop width (~1400px). Also check
  tablet (~768px) when the layout switches at `sm:` (640px) or `lg:` (1024px).
- Mobile and desktop are often styled separately: unprefixed classes apply to phones, and `sm:` / `lg:`
  override them on larger screens. Fixing only the `sm:` side leaves phones broken, and fixing only the
  base classes can break desktop. Update both.
- Some components switch layout with JS media queries instead of CSS:
  - `Paintings` changes its column count.
  - `FindMark` uses `useMedia("(pointer: coarse)")` and `useMedia("(max-width: 700px)")` for the
    joystick, card placement and button labels.
  - Others show text only at one size (`sm:hidden` / `hidden sm:inline`).

  Change both branches.

- The 3D walk's HUD must stay usable with touch: keep tap targets at least 44px (`size-11`), and don't
  put cards or buttons over the joystick or under the top bar.
- No horizontal scrolling at phone width.
- Look at the result at both sizes before saying it's fixed, for example with a headless-Chrome
  screenshot against `npm run dev`. If you couldn't check one of the sizes, say so.

## Architecture

A portfolio for an Ilonggo artist. It's a showcase only: no shop, postcards are sold in person at Molo
Mansion, and commissions are by phone or Messenger. Tailwind v4 (theme tokens such as `--color-paper` and
`--color-ink`, plus `.btn` and `.print` classes, live in `src/app/globals.css`), Motion, and three.js via
React Three Fiber.

**Content and anchors**

- Site-wide details (name, phone, bio) are in `src/data/site.ts`. Each section's content is in
  `src/sections/<section>/content.ts`.
- `src/sections/sections.ts` is the single source for section anchor ids, nav labels and page paths. Use
  `id={sections.x.id}`, `href(sections.x)` and `pages.*`; don't hard-code `#ids` or paths.

**Pages**

- `src/app/page.tsx` is the one-page landing: Hero → Ribbon (floating islands) → Paintings → Textiles →
  Postcards → About → Collectors → Commission.
- Standalone routes: `/paintings/[slug]`, `/iloilo` and `/find-mark`.
- SEO structured data is built with the helpers in `src/lib/schema.ts` and rendered through `JsonLd`.
  Every artwork gets a node.

**Shared visual pieces** (`src/components/ui`)

- `Watercolor` draws SVG watercolour washes stretched over a section with `preserveAspectRatio="none"`.
  A bloom near the section's top or bottom edge gets clipped into a hard line, so fade it with a mask.
- The body has a paper-grain background. A section that paints its own flat background shows a visible
  seam against it, so fade to transparent rather than to `#f5efe3`.
- Others in this folder: `TiltCard`, `Reveal`, `SectionHeading`, `Ornaments`, `ImageLightbox`.
- Images inside a `[data-protect]` container can't be right-clicked or dragged (`ImageProtection`).

**Reduced motion.** Animated and 3D parts check `prefers-reduced-motion`, via `useSyncExternalStore` so
the server and client renders agree. Examples: `Ribbon` shows a still placard, and the find-mark walk
skips its camera swoops.

**Heavy 3D is lazy.** R3F scenes are loaded with `next/dynamic` (`ssr: false`), and often only start once
they scroll into view. See `Ribbon.tsx` and `FindMarkTeaser.tsx`.

### Floating islands (`src/sections/floating-islands`)

A spinnable 3D band of procedurally built islands (rock, jungle, city, Molo church, strawberry,
waterfall), circled by text labels.

### "Where's Mark?" 3D walk (`src/sections/find-mark`)

A game-like walk through real Molo, Iloilo City, built mostly with plain three.js inside one R3F canvas.

**Data flow**

- `scripts/build-molo-map.mjs` turns OpenStreetMap data into the generated file `molo-map.ts`.
- Coordinates are metres from Molo Plaza's centre: x = east, z = south.
- `build-world.ts` assembles the scene from that map data:
  - `ground.ts`: roads and terrain, plus `nearestRoad()`
  - `buildings.ts`: buildings extruded from their footprints
  - hand-modelled `church.ts` and `mansion.ts`, placed in their own `Frame`s from `world.ts`
  - `props.ts`: plaza monuments, kiosks, shop signs, and the bee mascot outside the Jollibee
  - `trees.ts`: instanced trees
- `kit.ts` (`Kit`) builds models from boxes, cylinders and balls, each one flat colour, and merges them
  into a single geometry.

**Runtime**

- `game.ts` (`Game`) holds the shared state between the React page and the scene: position, controls,
  route and guiding (`guide(on, "mark" | "supermart")`), plus events sent through `emit`.
- `walk.ts` (`Walk.frame`) runs every frame: movement, camera, landmarks, trail, and updates to uniforms
  such as `time` and `seeThrough` from `materials.ts`.
- `FindMark.tsx` is the HUD: cards, buttons, joystick and minimap. It listens to `Game` events.

**Walking and pathfinding.** `collide.ts` holds the `Obstacles` (wall segments and circles) and the
`WalkGrid` pathfinding. Anything solid you add must also register an obstacle.

**Landmarks** (`landmarks` in `world.ts`)

- Walking within a landmark's `radius` pops up its card.
- An optional `music: { src, start, title }` plays an audio file from `start` seconds instead of the
  chime. This uses `Ambience.playSong` / `stopSong` in `audio.ts`; all other sounds are generated with
  the Web Audio API.

**Inside St. Anne's** (`church-interior.ts`)

- The church can be entered. `PLAN` holds its floor plan in church-local metres.
- `insideLocal`, `floorLocal` and `ceilingLocal` drive the floor heights (in `Terrain`) and keep the
  camera under the ceilings.
- `addChurchObstacles` replaces the old solid footprint with walls that leave a gap at the door.
- The interior is a separate mesh. `Walk` hides the exterior while the camera is inside, and shows the
  interior while the camera is inside or the walker is at the door.
- The inside walls sit `IN` (0.2 m) inside the outline so they never poke through the outside walls.
- Walking into the nave rings `Ambience.bells()`: it plays `public/church-bell.mp3` if present, otherwise
  a synthesised bell.

**Lost postcards quest** (`quest.ts`)

- It starts once you've found Mark: pressing "Keep exploring" on his card opens a story card in his
  voice ("The wind took my postcards!"). Closing it sets `game.questStarted`, which shows the postcards,
  their minimap markers and the counter, and sets `game.questHint`, which makes the markers pulse.
- Five postcards float over the spots in `LOST_POSTCARDS` (`world.ts`), each with a glow and a gold
  beam. Walking into one adds it to `game.collected`, plays `Ambience.pickup()` and emits `postcard`.
- Coming back to Mark with all five emits `quest-done` and shows the quest card.

**Riding the traffic** (`ride.ts`)

- Any jeepney, tricycle or car that stops for you (stand in its lane) can be boarded: "Sakay!" or E.
- While you ride, the vehicle's closed shell hides and a real-size cabin from `buildCabin` rides on the
  same object. `seatCamera` puts the camera in a seat; V or the ride bar switches seats or goes outside.
- "Para po!" or E stops it, and you step off on the kerb side. A car or tricycle on a one-way run stops
  at the end of its street.
- `Traffic.rider` / `stopRequested` drive the ridden vehicle. `Walk` runs the traffic update before
  moving you, so the seat camera never lags.

**Shop signs** come from `signs` in `molo-map.ts`. Each is hung on its building's street-facing wall.
Optional `street` pins it to the wall facing a named road; `BRAND_COLOURS` in `labels.ts` overrides a
sign's colours.

**Hand-added map features.** `molo-map.ts` is generated, but some features don't exist in OSM: the
Jollibee building, the bee mascot's point, and sign overrides. These are added in the "Hand-added" block of
`build-molo-map.mjs` and mirrored by hand in `molo-map.ts`. Keep both in sync, since the script needs
network access to re-run. The map data is © OpenStreetMap (ODbL); keep the on-page credit.
