# SkyMap AR/VR — Implementation Report (Pass 1)

**Date:** 2026-01-15  
**Scope:** Stage 0 audit + Stage 1–3 engineering fixes (skymap-web + React AR mode selector)

---

## Completed in this pass

| Feature | Status | Location |
|---------|--------|----------|
| Stage 0 audit document | ✅ | `docs/PROJECT_AUDIT.md` |
| BOTH / PLANETS / CONSTELLATIONS (skymap-web) | ✅ (pre-existing, verified) | `render/types.ts`, `main.ts` |
| BOTH / PLANETS / CONSTELLATIONS (React AR) | ✅ | `celestialVisibility.ts`, `ARSkyView.tsx` |
| 88 IAU constellations + validated lines | ✅ | `data/*.json`, `validate-catalog.mjs` |
| Line-endpoint stars in catalog | ✅ | `build-catalog.mjs` |
| Great-circle constellation lines | ✅ | `astronomy/spherical.ts`, `buildScene.ts` |
| Spherical angular measure arc | ✅ | `buildScene.ts` (measure pair) |
| Planetary ephemeris (astronomy-engine) | ✅ | `planets.ts` |
| Automated astro math tests | ✅ | `npm run test:astro` |
| Catalog validation CI script | ✅ | `npm run validate:catalog` |
| Sensor unavailable banner | ✅ | `index.html`, `main.ts` |

---

## Partial / next passes

| Feature | Status | Notes |
|---------|--------|-------|
| WebGL as primary renderer | Partial | Optional via layer drawer |
| WebXR immersive VR | Stub | Falls back to planetarium |
| Full Madgwick + NOAA WMM file | Partial | Lightweight fusion + declination helper |
| 2000+ star expansion to Gaia | Partial | 4087 stars in advanced catalog; Gaia ingest not wired |
| Backend `/api/sky/*` used by skymap-web | No | Client-side catalog only |
| Stellarium cross-check automation | No | Manual benchmark list in tests only |
| React AR constellation graph = IAU full graph | Partial | Still uses `CONSTELLATION_DEFS` lite set |

---

## Test results (executed)

```text
npm run validate:catalog  → 0 missing star references, 88 constellations
npm run test:astro        → mode filter, projection, 5-location round-trip, planets
npm run build             → (run after changes)
```

Record angular error table in `skymap-web/docs/BENCHMARK.md` after device field tests.

---

## Known limitations

- Desktop browsers often lack reliable compass — planetarium mode or manual yaw required.
- SIMBAD calls are debounced; offline use does not block identification.
- Two frontends share concepts but not a single bundle — consolidate long-term.

---

## Attribution

- Constellation lines/bounds: d3-celestial / Stellarium-derived IAU data (verify license for publication).
- Planets: astronomy-engine (VSOP87 class).
- SIMBAD: CDS Strasbourg (optional).