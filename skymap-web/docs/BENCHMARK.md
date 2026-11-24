# SkyMap v2 Benchmark Matrix

## Targets (Phase 9)

| Metric | Target | How to measure |
|--------|--------|----------------|
| Frame rate | 60 FPS sustained | Chrome DevTools Performance, 60s AR session |
| Catalog load | < 50 ms | Console log from `loadCatalog()` |
| Memory | < 80 MB | Chrome Memory snapshot after catalog load |
| Battery | < 12% / hr | OS battery stats during 1 hr planetarium (mobile) |

## Cross-browser checklist

- [ ] iOS Safari — orientation permission, True North via webkitCompassHeading
- [ ] Android Chrome — HTTPS dev server, WMM declination offset
- [ ] Desktop Chrome — SKY dome mouse drag, time slider

## Astronomy validation

Compare Sirius and Polaris alt/az vs Stellarium at:

- Mumbai (19.08°N, 72.88°E)
- London (51.5°N, 0.1°W)
- New York (40.7°N, 74°W)
- Sydney (-33.9°S, 151.2°E)
- Nairobi (-1.3°S, 36.8°E)

Tolerance: **0.05°** after Phase 2 ICRS pipeline.