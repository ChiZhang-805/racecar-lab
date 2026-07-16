# 2026 Grand Prix team-model basis

Last checked: 2026-07-16

## What these models are

RaceCar Lab contains four code-generated study cars: Ferrari SF-26, McLaren MCL40, Mercedes W17, and Red Bull RB22. They are separate geometry profiles, not four paint presets on one mesh. Nose proportions, cockpit placement, monocoque, sidepod and inlet volume, engine cover, floor boards, diffuser slots, wing sweep, suspension pickups, airbox, and power-unit package all respond to the selected profile.

They remain educational interpretations. Public rules and launch material do not provide production CAD, hidden cooling layouts, suspension kinematics, laminate schedules, software, or complete internals. Scene values are dimensionless modelling controls and must not be read as team measurements.

No team badge, sponsor mark, official texture, or downloaded team model is bundled. Colour is used only as an unbranded orientation aid.

## Evidence labels used in the interface

- **Official specification** — a rule, architecture, dimension, or statement published by the FIA or the relevant team.
- **Public observation** — an exterior feature visible in public imagery or described in official Formula 1 technical coverage.
- **Teaching inference** — an explanatory mesh or flow path derived from public evidence. It is visually explicit so that a learner can inspect the trade-off, but it is not presented as a hidden team fact.

Each Grand Prix part card carries one of these labels. Where team-specific evidence is unavailable, the card says so rather than inventing a difference.

## Shared 2026 regulatory anchors

Primary source: [FIA 2026 Formula 1 Technical Regulations, Section C, Issue 19 (25 June 2026)](https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf).

- Maximum bodywork width is represented against the 1900 mm total envelope.
- The scene scale is tied to the 3400 mm maximum wheelbase.
- The model uses the 18-inch wheel architecture and front/rear rim-width distinction.
- The powertrain baseline is a 1.6-litre 90-degree V6, single turbo, eight forward ratios, 350 kW MGU-K, and no MGU-H.
- Active front and rear aero uses fixed primary profiles plus movable permitted elements rather than rotating the whole wing.
- The common Halo, wheel-retention, annular wheel-disc, survival-cell, and impact-structure concepts remain shared constraints.

These anchors provide traceability, not homologation or CAD fidelity.

## Ferrari SF-26 study profile

Sources: [official Ferrari reveal and specification](https://www.ferrari.com/en-EN/formula1/articles/ferrari-unveils-the-sf-26) and [official Formula 1 technical analysis](https://www.formula1.com/en/latest/article/the-fascinating-tech-secrets-of-the-2026-regulations-revealed-by-ferrari-and.3cMuqQXJ7RTqHvGkyV1H8t).

Implemented study cues:

- lower, finer nose and a smaller under-nose feed window;
- a visible three-vane rigid floor-board concept and diffuser-feed teaching slots;
- front and rear push-rod suspension cues;
- Ferrari 067/6 power-unit identity and distinct works-package proportions;
- a fuller red body with unbranded white orientation surfaces.

Core learning question: how can floor-board and diffuser flow recover performance when a lower nose reduces the open volume beneath the chassis?

## McLaren MCL40 study profile

Sources: [official McLaren technical specification](https://www.mclaren.com/racing/formula-1/2026/what-is-the-technical-specification-of-our-2026-formula-1/), [official MCL40 design briefing](https://www.mclaren.com/racing/formula-1/2026/behind-the-design-of-the-mcl40/), and [official Formula 1 sidepod comparison](https://www.formula1.com/en/latest/article/theyve-been-quite-smart-and-innovative-stella-singles-out-different-design-trend-from-mclaren-rival.4JiI9b23NHWjwnK53TBQNH.4JiI9b23NHWjwnK53TBQNH).

Implemented study cues:

- a longer nose with a more pronounced undercut than Ferrari;
- deeper sidepod shoulder cut, narrow inlet, and stronger floor-edge sweep;
- front and rear push-rod cues with different visible pickup positions;
- McLaren chassis and cooling proportions around the Mercedes-AMG M17;
- papaya, anthracite, and restrained cyan orientation surfaces without marks.

Core learning question: why does McLaren require its own cooling, sidepods, floor, and chassis package while sharing the Mercedes power-unit family?

## Mercedes W17 study profile

Sources: [official W17 technical specification](https://www.mercedesamgf1.com/f1-w17-2026-technical-specifications), [official W17 reveal](https://www.mercedesamgf1.com/news/mercedes-amg-f1-2026-challenger-w17-revealed), and [official Formula 1 technical analysis](https://www.formula1.com/en/latest/article/the-fascinating-tech-secrets-of-the-2026-regulations-revealed-by-ferrari-and.3cMuqQXJ7RTqHvGkyV1H8t).

Implemented study cues:

- the highest and broadest nose of the four profiles, with the largest explicit under-nose channel;
- a visibly forward cockpit and corresponding monocoque shift;
- calmer floor-board sweep, broader diffuser slot, and a taller works-engine-cover package;
- Mercedes-AMG M17 works integration rather than the McLaren customer chassis package;
- silver, black, and cyan orientation surfaces without PETRONAS or team branding.

Core learning question: how do a forward cockpit and higher nose alter wheel wake, floor feed, mass placement, and driver perception?

## Red Bull RB22 study profile

Sources: [official RB22 car profile](https://www.redbullracing.com/int-en/cars/rb22), [official Red Bull 2026 guide](https://www.redbullracing.com/int-en/f1-season-guide-2026), and [official Formula 1 sidepod comparison](https://www.formula1.com/en/latest/article/theyve-been-quite-smart-and-innovative-stella-singles-out-different-design-trend-from-mclaren-rival.4JiI9b23NHWjwnK53TBQNH.4JiI9b23NHWjwnK53TBQNH).

Implemented study cues:

- a wide nose and strongly swept front-wing relationship;
- the narrowest, lowest, most steeply falling tube-like sidepods in the set;
- more exposed floor, two dominant floor-board elements, and a taller upper cooling cover;
- Red Bull Ford DM01 works power-unit identity with its own package proportions;
- heritage white, deep navy, red, and yellow orientation surfaces without the bull or sponsor marks.

Core learning question: how can narrow falling sidepods expose more floor while moving inferred cooling volume and mass upward?

## Implementation and regression contract

- `src/grandPrixTeams.ts` holds the four public-evidence profiles, scene controls, power-unit identities, facts, and source URLs.
- `src/CarScene.tsx` consumes those controls for actual geometry; selection is not a material-only switch.
- `src/GrandPrixGarage.tsx` provides the in-lab selector, evidence cards, sources, and four-car comparison.
- `src/grandPrixTeamLens.ts` maps all 18 assemblies to a current-team evidence note, including explicit non-public boundaries.
- Selection persists under `racecar-lab-grand-prix-team`; the older `racecar-lab-grand-prix-livery` key is read once as a compatibility fallback.
- Unit tests require four unique geometry signatures, complete evidence tiers, valid public sources, and 72 localized team-part lenses.
- Browser tests switch and screenshot all four cars, verify geometry attributes and persistence, exercise the comparison view, and check desktop plus 320 px portrait overlap boundaries.

Launch images are snapshots, not a promise that the racing car will remain unchanged. Future updates must re-check the [official Formula 1 launch-car guidance](https://www.formula1.com/en/latest/article/the-beginners-guide-to-f1-car-launches.5njwLoM1KId9QBthP9PAOH), current FIA issue, and team sources before changing a profile.
