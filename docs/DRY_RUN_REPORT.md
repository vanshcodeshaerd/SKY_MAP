# SkyMap AR/VR — Dry Run Report (automated)

**Run date:** 2026-11-24 (agent environment)  
**Observer used for ephemeris checks:** Los Angeles, CA (34.0522°N, 118.2437°W)

---

## 1. Backend (FastAPI) — status: **PASS**

| Check | Result |
|--------|--------|
| `pytest tests/` (after `pip install -r requirements.txt`) | **16 passed** |
| `GET /api/health` | **200** — `online`, Skyfield DE421 |
| `GET /api/solar/position` (Sun, LA) | **200** — alt **29.49°**, az **209.37°** |
| `GET /api/constellations` | **200** — **88** constellations |
| `GET /api/stars?limit=5` | **200** |

**Note:** Run `pip install -r backend/requirements.txt` before first use (includes `skyfield`).

---

## 2. Frontend ↔ backend connection — status: **CONFIGURED (verify on your machine)**

| Piece | Configuration |
|--------|----------------|
| React app (`frontend/`) | Vite dev server **:5173**, proxy `/api` → `http://localhost:8000` |
| Health poll | `App.tsx` uses `probeServerHealth()` every **10 s** (navbar shows **DE421 API** vs **Local AR**) |
| Vercel proxy | Root `vercel.json` rewrites `/api/*` → Render; optional `VITE_API_BASE_URL` |
| Render CORS | Default regex includes `https://.*\.vercel\.app` |
| Constellation Play | Same Vercel deploy at `/constellations/` (skymap-web build) |
| `skymap-web/` | **Standalone** AR + optional API chip (`/api/health`) |

**Live HTTP dry run** from the agent sandbox could not always reach `127.0.0.1:8000` across processes; **in-process `TestClient`** confirms all routes.

**Your checklist:**

```bash
# Terminal 1
cd backend && pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2
cd frontend && npm install && npm run dev
# Open http://localhost:5173 — navbar should show server online

# Constellation AR (no backend required)
cd skymap-web && npm install && npm run dev
```

---

## 3. Position accuracy (Sun, LA, same timestamp)

| Source | Altitude | Azimuth |
|--------|----------|---------|
| Backend (Skyfield DE421 + refraction) | 29.494° | 209.37° |
| Client skymap-web (astronomy-engine) | 29.52° | 209.3° |

| Metric | Value | Target |
|--------|-------|--------|
| **Δ altitude** | **~0.03°** | < 0.15° |
| **Δ azimuth** | **~0.07°** | < 0.30° |

Moon/planets at same time (client, LA): Moon **−26°** (below horizon), Venus **+15.4°**, etc. — consistent with Sun still above horizon at test UTC.

---

## 4. Star coordinate accuracy — status: **PASS**

`npm run test:astro` (skymap-web):

| Test | Result |
|------|--------|
| 5 cities × RA/Dec ↔ Alt/Az round-trip | **< 0.0001°** error |
| Polaris alt vs latitude (northern sites) | **< 1°** |
| W3C rear-camera projection (N/E boresight) | **PASS** |
| Catalog validation | **88** constellations, **0** broken line refs |

---

## 5. AR stability & constellation detection (automated limits)

These are **engine parameters**, not measured FPS on a physical phone:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Attitude smoothing | **0.28–0.72** adaptive | Low lag when panning, damp when still |
| Sky ENU refresh (live) | **~120 ms** | Time/location-accurate star positions |
| Constellation tracker dwell | **180 ms** | Faster ID when moving between constellations |
| Recognition UI throttle | **250 ms** | Cards/SIMBAD without jank |
| Removed double fusion lag | yes | Single attitude pipeline |

**Cannot automate in CI:** real camera passthrough, magnetometer quality, or “Sun icon on actual Sun” — requires **on-device** test in California with GPS + motion permission.

**Recommended device QA (5 min):**

1. Allow **Location** + **Motion**; confirm HUD shows **GPS**.
2. Select **Sun** — compare HUD **ALT/AZ** with a trusted app (e.g. Stellarium, time synced).
3. Point camera at Sun — icon within **~2–5°** after calibration nudge.
4. Pan quickly — sky overlay should **track within ~100–200 ms** (no “floating” seconds behind).

---

## 6. Commands to repeat this dry run

```bash
cd backend && python -m pytest tests/ -q
cd backend && python scripts/dry_run_compare.py

cd skymap-web
npm run validate:catalog
npm run test:astro
npm run dry-run
```

---

## 7. Honest “top notch” gap list

| Area | Automated | Device still needed |
|------|-----------|---------------------|
| Sun/Moon/planet math | **Excellent** (~0.03° vs DE421) | Refraction at unusual elevation/temperature |
| 88 constellation graph | **Validated** | Visual stick figures at night |
| AR lock to camera | Math **fixed** (ENU pitch) | Compass calibration per device |
| Backend API | **Pass** | CORS when not using Vite proxy |
| WebGL / WebXR FPS | Not measured | Target 60 FPS on mid-range phone |

---

## 8. Verdict

- **Backend:** healthy, tests green, catalog API serves 88 constellations.  
- **Frontend link:** proxy + health check wired; start both servers to see “online” in UI.  
- **skymap-web AR:** scientifically aligned for **California** when GPS/IP location is used; automated accuracy **sub-tenth-degree** Sun agreement with backend.  
- **Camera detection stability:** architecture tuned for **real-time** tracking; **perfect** alignment is only confirmed on **your** phone after GPS, permissions, and optional calibration.

---

## 9. Phase 1 Play mode — phone QA (manual)

Automated tests cover catalog graph, mode flags, and quest edge math. Confirm on a real device:

1. **STARS** — stars and stick figures only (no Sun/Moon/planet disks or planet chip bar).
2. **PLANETS** — bodies only; layer “Stars” checkbox is disabled and cannot bring stars back.
3. **BOTH** — stars and planets together.
4. **Calibrate** — hold a bright star (or the Moon in BOTH/PLANETS) in the reticle ~1s; overlay heading should snap. Slider still works.
5. **Play: Connect the Stars** — complete one figure in AR (dwell or tap) and one in Sky 360°. Hint shows a faint outline. Skip picks another above-horizon figure when possible.
6. Switching to PLANETS or BOTH while playing exits Play with no leftover gold lines.