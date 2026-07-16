<h1 align="center">RaceCar Lab</h1>

<p align="center">
  <strong>An interactive Formula racing engineering lab built for learning by doing.</strong>
</p>

<p align="center">
  Explore two teaching vehicles through 3D breakdowns, hands-on simulations, engineering cards, formulas, and quizzes.
</p>

<p align="center">
  <a href="http://124.221.220.60/"><img alt="Open the live demo" src="https://img.shields.io/badge/Live_Demo-Open_RaceCar_Lab-E10600?style=for-the-badge&logo=googlechrome&logoColor=white"></a>
  <a href="https://github.com/ChiZhang-805/racecar-lab"><img alt="View the source on GitHub" src="https://img.shields.io/badge/GitHub-View_Source-181717?style=for-the-badge&logo=github&logoColor=white"></a>
  <a href="#validation"><img alt="View validation commands" src="https://img.shields.io/badge/Checks-73_Unit_%2B_13_Browser-2EA44F?style=for-the-badge&logo=vitest&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://react.dev/"><img alt="React 19" src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white"></a>
  <a href="https://threejs.org/"><img alt="Three.js" src="https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white"></a>
  <a href="https://vite.dev/"><img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white"></a>
  <a href="https://playwright.dev/"><img alt="Playwright" src="https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white"></a>
</p>

## At a glance

| Vehicles | Core parts | 3D workbenches | Subcomponents | Experiments | Formulas | Questions |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 36 | 36 | 216 | 90 | 108 | 180 |

RaceCar Lab is a full-screen, browser-based learning experience for Formula Student and modern hybrid single-seater engineering. It combines interactive 3D models with practical explanations, live calculations, diagnostic scenarios, and structured courses.

## Highlights

- Rotate, zoom, focus, isolate, explode, and inspect two complete 3D race cars.
- Switch the Grand Prix car among four persistent, logo-free 2026 livery interpretations.
- Explore 36 dedicated part workbenches with 216 selectable subcomponents.
- Learn through adjustable simulations, live charts, KaTeX formulas, and worked examples.
- Practice with 180 bilingual concept, calculation, diagnosis, and design questions.
- Switch between fully separated English and Chinese content.
- Use the experience on desktop or portrait mobile with keyboard and reduced-motion support.
- Keep language, vehicle, course progress, quiz scores, and music settings in local browser storage.

## Quick start

Requirements: Node.js `20.19+` or `22.12+`. The recommended version is stored in [`.nvmrc`](.nvmrc).

```bash
npm install
npm run dev
```

Open [http://localhost:4173](http://localhost:4173).

## Validation

```bash
npm test
npm run build
npm run test:browser
```

- `npm test` checks content integrity, vehicle isolation, simulation boundaries, formulas, assets, and model mappings.
- `npm run build` runs TypeScript and creates the production Vite bundle in `dist/`.
- `npm run test:browser` exercises both vehicles, both languages, all 36 part models, responsive layouts, and accessibility in Chromium.

Run the complete validation pipeline with:

```bash
npm run verify
```

## Project map

- [`src/App.tsx`](src/App.tsx) — application state, navigation, settings, courses, dialogs, and music.
- [`src/CarScene.tsx`](src/CarScene.tsx) — complete-car geometry, cameras, selection, x-ray, and exploded views.
- [`docs/2026-grand-prix-model-and-livery-basis.md`](docs/2026-grand-prix-model-and-livery-basis.md) — official public sources, geometry anchors, livery cues, and accuracy boundaries.
- [`src/ComponentWorkshop.tsx`](src/ComponentWorkshop.tsx) — 36 interactive part workbenches.
- [`src/EngineeringDetail.tsx`](src/EngineeringDetail.tsx) — engineering lessons, formulas, simulations, and diagnostics.
- [`src/KnowledgeCenter.tsx`](src/KnowledgeCenter.tsx) — quizzes, filters, scoring, and progress.
- [`AUDIT_REPORT.md`](AUDIT_REPORT.md) — latest engineering, accessibility, asset, test, and deployment audit.
- [`PROJECT_HANDOFF.md`](PROJECT_HANDOFF.md) — current maintenance and deployment handoff.

## Deployment

The app is a static Vite build served by Nginx. Versioned releases, health checks, atomic switching, and rollback are handled by [`deploy/deploy-racecar-lab.sh`](deploy/deploy-racecar-lab.sh) and [`deploy/racecar-lab.nginx.conf`](deploy/racecar-lab.nginx.conf).

The current public build is available at [http://124.221.220.60/](http://124.221.220.60/).

## Important boundaries

- The 3D models are educational, code-generated geometry—not manufacturing or certification CAD.
- The four team-style liveries are unofficial educational interpretations and intentionally omit logos and sponsor artwork.
- Simulations explain trends and trade-offs; they do not replace CFD, FEA, rig testing, track correlation, or regulatory approval.
- Progress is stored locally and does not sync across browsers or devices.
- Seven audio tracks still require complete first-party source and redistribution records before long-term public use.
- A production domain should use HTTPS and meet the applicable hosting and registration requirements.
