# SkyMap AR/VR — UI Betterment & Design System PlanRE

**Design Inspiration:** [21st.dev](https://21st.dev) (Observatory Dark Glassmorphism, Floating Docks, Animated Segmented Controls, and Command-Palette Search)  
**Target Experience:** Mobile-first, unobstructed sky viewport with crisp, non-overlapping HUD controls.

---

## 1. Visual & Ergonomic Audit of Previous UI
1. **Panel Collisions:** `#search-panel`, `#layer-drawer`, and `#constellation-card` were all anchored near `top-right`, causing overlaps when opened together.
2. **Header / Compass Overlap on Mobile:** Wrapping header controls covered the fixed `top-14` compass strip on narrow screens.
3. **Bulky Left Planet Column:** 7 stacked vertical buttons blocked the left edge of the camera and collided with `#planet-card`.
4. **Uncloseable Inspector Card:** `#constellation-card` lacked a dismiss/minimize action and re-opened on every 250 ms tick.
5. **Always-Visible Time Slider:** Occupied vertical sky space even when observing live time.

---

## 2. 21st.dev-Inspired Design System & Architecture

### A. Unified Non-Overlapping HUD Grid
```
┌─────────────────────────────────────────────────────────────────────────┐
│ TOP STACK (Unified flex column — zero overlap at any screen width)      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ [AR | SKY 360° | VR]   [BOTH | PLANETS | CONSTELLATIONS]  [🔍🕒🧭⚙]│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                  [ N · NE · E · SE · S · SW · W · NW | 0° N ]           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐                     ┌───────────────────────┐  │
│  │ Constellation Card  │         ⊕           │ Planet / Search /     │  │
│  │ (Collapsible, ✕,    │   (Clean Reticle)   │ Layers (Mutually      │  │
│  │  Auto-Detect btn)   │                     │ Exclusive Drawers)    │  │
│  └─────────────────────┘                     └───────────────────────┘  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ BOTTOM DOCK (Centered max-w-2xl floating glass dock)                    │
│  • Collapsible Time Machine ([NOW] reset button)                        │
│  • Horizontal Scrollable Solar System Pill Strip (auto-hidden in CON)   │
│  • Compact Telemetry Pill: [ ALT | AZ | BORESIGHT | LOCATION ]          │
└─────────────────────────────────────────────────────────────────────────┘
```

### B. 21st.dev Component Patterns Adopted
1. **Observatory Dark Glass (`hud-glass`):** `rgba(11, 15, 23, 0.72)` with `backdrop-filter: blur(20px)`, crisp `1px` `rgba(148, 163, 184, 0.16)` borders, and subtle top-edge `inset 0 1px 0 rgba(255,255,255,0.06)` specular highlight.
2. **Segmented Pill Controls (`hud-pill-active`):** High-contrast cyan active pill (`#38bdf8`) inside recessed `bg-black/30` tracks for both Environment (`AR | SKY 360° | VR`) and Celestial Filter (`BOTH | PLANETS | CONSTELLATIONS`).
3. **Command-Palette Search (`Ctrl/Cmd + K` & 🔍 button):** Instant fuzzy-style filtering across all 88 constellations, bright stars, and Solar System bodies with mutual exclusion against the Settings drawer.
4. **Collapsible Accordion Inspector (`<details>`):** Constellation card groups *Origin & IAU Standardization*, *Main Stars*, and *Mythology* cleanly, with an `Auto-Detect` unlock button and `✕` dismiss persistence (`cardDismissedForCon`).
5. **Scrollable Floating Bottom Dock:** Replaces the vertical left planet column with a thumb-friendly horizontal pill bar and collapsible Time Machine.

---

## 3. Verification Checklist
- [x] Zero overlapping panels on mobile (`375px`) and desktop (`1440px`).
- [x] `Ctrl/Cmd + K` opens Search and closes Layers automatically.
- [x] Dismissing Constellation Card persists until a new constellation is selected.
- [x] Wheel zoom in `SKY 360°` Planetarium smoothly updates FOV (`25°–115°`).
- [x] `Time Machine` toggles cleanly from the clock icon and resets to live time via `NOW`.
