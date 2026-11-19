---
name: pulsecity
description: Nightshift Runner — a vanilla-JS canvas neon-cyberpunk endless runner PWA that teaches side-scroller physics, parallax rendering and offline-first installable games.
---

# Nightshift Runner

## What this skill gives the model

After reading this skill, the model understands:

- the genre and core loop of Nightshift Runner (a 2D side-scrolling endless runner)
- the exact mechanics (auto-run, jump, slide, boost, hull, scoring, difficulty ramp)
- the controls (touch + keyboard + mouse)
- the PWA structure required (manifest, service worker, icon)
- the file layout and how to deploy on GitHub Pages

## Game design

Nightshift Runner is a single-button-feel endless runner set in a neon cyberpunk city at night. The player controls a black silhouette runner with a glowing cyan visor who auto-runs to the right while the world scrolls left. The runner stays at a fixed horizontal position on screen; obstacles and collectibles approach from the right edge and must be avoided or collected. The visual identity is built entirely from canvas primitives: a dark blue-to-purple sky gradient, a pale glowing moon, two parallax layers of building silhouettes studded with random yellow and cyan lit windows, a dark street with a cyan-to-magenta neon edge line, and scrolling street markings. No external images, fonts, or libraries are used.

The objective is to survive as long as possible while building score. Score comes from distance travelled (1 point per ~8 pixels scrolled) plus energy cores collected (+10 each). The run ends when hull reaches zero. Hull starts at 3 pips; each collision with an obstacle costs one hull and grants one second of invulnerability (a blink effect) so the runner can recover. Shield packs are rare green collectibles that restore one hull, capped at the maximum of three.

The art direction is high-contrast neon on near-black. The runner is a small humanoid silhouette with a horizontal cyan visor line and animated legs that alternate on a run cycle, tuck during a jump, and extend forward during a slide. Obstacles are colour-coded: low barriers are magenta neon rectangles you jump over, laser gates are red horizontal beams between dark posts you slide under, and flying drones are dark hexagons with a blinking red light that appear at either a low height (jump) or head height (slide). Energy cores are cyan glowing circles; shield packs are green diamonds. A subtle horizontal speed-line effect overlays the screen while boosting.

Progression is distance-driven: scroll speed ramps from 320 px/s up to a 760 px/s cap, and the spacing between spawns shrinks as distance grows, so the game gets faster and denser the longer you survive. The best score is persisted to localStorage so runs across sessions compete against a personal record.

## Mechanics in detail

- **Auto-run + scroll.** The runner's x is fixed at ~26% of viewport width. Each frame `distance += speed * dt`; the world (buildings, obstacles, collectibles, street markings) translates left by `speed * dt`. Speed = `min(MAX_SPEED, BASE_SPEED + distance * SPEED_K)`, multiplied by `BOOST_MULT` while boosting.
- **Jump.** Sets `vy = JUMP_VEL` only when grounded (cancels an active slide first). Gravity integrates `vy`; landing snaps `y` to `groundY`. Apex height (~184px) clears all low barriers.
- **Slide.** On the ground, sets `sliding = true` for `SLIDE_TIME` (0.6s) and lowers the collision hitbox to a short height so laser gates and high drones pass overhead. In the air, pressing slide fast-falls the runner.
- **Boost.** Requires a full pulse-charge bar (100). Holding Shift / the BOOST button activates a 2-second boost: speed x1.7 and score-rate x2, charge drains to zero, then an 8-second cooldown blocks reactivation. Charge is filled by collecting energy cores (+25 each, ~4 cores per full bar).
- **Hull + invulnerability.** Start 3. A collision subtracts 1 hull, triggers a 1s blink i-frame, removes the offending obstacle, shakes the screen and flashes red. At 0 hull the game ends.
- **Scoring.** `score += speed * dt / 8` (x2 while boosting), plus `+10` per energy core. Best is the integer floor of score, saved to `localStorage["nightshiftRunner.best"]`.
- **Spawning.** Distance-based scheduling is frame-rate independent: `nextObstacleDist` and `nextCoreDist` thresholds shrink with distance. Early runs see mostly low barriers; gates and drones appear after ~700px and dominate after ~1700px. Cores spawn in short lines or arcs; ~8% of core spawns are a shield pack instead.
- **Collision.** Axis-aligned bounding boxes. The runner's standing hitbox is a slim rect from feet up to head height; the sliding hitbox is a short low rect. Each obstacle exposes a matching hitbox (drone = square around the hexagon centre, gate = the laser band only, barrier = its full rect).
- **Difficulty ramp.** Speed grows linearly with distance up to the cap; spawn gaps shrink from ~460px to a ~260px floor. Leg animation speed ties to scroll speed for a sense of acceleration.

## Controls

- **Touch:** tap the upper half of the screen to jump; tap the lower half or swipe down to slide; hold the on-screen BOOST button to boost. On-screen JUMP / SLIDE / BOOST buttons sit along the bottom edge and also work with a mouse.
- **Keyboard:** Space / Up arrow / W to jump; Down arrow / S to slide; hold Shift to boost; P or Esc to pause. Enter / Space starts or retries from the menus.
- **Mouse:** click the upper/lower half of the play field like a tap; click the on-screen buttons; click the on-screen CTA buttons on every screen.

## File layout

- `index.html` — entry point. Loads `styles.css` and `main.js`, registers `sw.js`, and holds the HUD, on-screen controls and the Start / Pause / Game Over overlay screens.
- `styles.css` — all styling: responsive neon HUD, safe-area-aware touch controls, overlay screens, animated pulse-charge bar. No external fonts.
- `main.js` — the whole game: canvas setup with DPR scaling, resize handling, parallax building layers, runner physics, obstacle/collectible spawning, collisions, particles, speed lines, drawing routines and the input layer for keyboard, pointer and buttons.
- `manifest.json` — PWA manifest with `start_url: "./"`, `scope: "./"`, `display: "fullscreen"`, `orientation: "portrait"`, theme/background colours and the SVG icon.
- `sw.js` — service worker that precaches the full shell on install, cleans old caches on activate, and serves a cache-first strategy with an offline fallback to `index.html`.
- `icon.svg` — the app icon: a neon runner silhouette with a cyan visor on a dark parallax city skyline with a moon and lit windows.

## How to run / deploy

1. Open `index.html` directly in a browser (the service worker needs http/https, but the game itself runs from the file system), OR
2. Push the `pulsecity/` folder to a GitHub repo and enable Pages — the game runs from the repo root or any subfolder because every path is relative.

## PWA install

The manifest and service worker make the game installable on Android, iOS and desktop. After the first load the shell is cached and the game runs fully offline.

## Customization hooks

All tuning lives as constants at the top of `main.js`:

- `BASE_SPEED`, `MAX_SPEED`, `SPEED_K` — run speed and its distance ramp.
- `GRAVITY`, `JUMP_VEL`, `SLIDE_TIME` — jump arc and slide duration.
- `HULL_MAX`, `INVULN_TIME` — durability and i-frame window.
- `BOOST_TIME`, `BOOST_COOLDOWN`, `BOOST_MULT`, `BOOST_SCORE_MULT`, `CHARGE_MAX`, `CHARGE_PER_CORE`, `CHARGE_DRAIN` — the boost economy.
- `SCORE_PER_PX`, `CORE_SCORE` — scoring rates.
- Spawn pacing in `updateSpawns()` and type weights in `spawnObstacle()`.
- Visual palette via the hex colours used in the `draw*` functions and the building layer `opts` in `makeBuildings()`.
