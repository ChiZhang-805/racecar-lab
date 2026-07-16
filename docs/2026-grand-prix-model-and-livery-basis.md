# 2026 Grand Prix model and livery basis

Last checked: 2026-07-16

## Scope and accuracy boundary

The Grand Prix car in RaceCar Lab is a code-generated educational model. It is not a scan, reverse-engineered team car, manufacturing CAD, or a claim about confidential internal packaging. Public regulations and team material support the exterior envelope, wheel, suspension, active-aero, power-unit and visual-language decisions; they do not expose the teams' production surfaces or internal drawings.

The four liveries are therefore unofficial, logo-free interpretations. They intentionally omit team badges, sponsor marks and protected artwork while retaining the publicly described colour balance and broad graphic rhythm.

## Governing 2026 technical anchors

Primary source: [FIA 2026 Formula 1 Technical Regulations, Section C, Issue 19 (25 June 2026)](https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf).

- Maximum bodywork half-width: 950 mm, or 1900 mm total.
- Maximum wheelbase: 3400 mm.
- Wheel rim nominal diameter: 18 inches; front/rear mounting widths: 315/401.3 mm; overall rim widths: 334/420.3 mm.
- Power unit: 1.6-litre 90-degree V6 with eight forward ratios and the 2026 electrical architecture.
- Active front and rear aerodynamic surfaces have two commanded positions; the primary front profile and rear mainplane remain fixed in the teaching animation while the permitted flaps move.
- Outboard annular wheel discs, central fasteners and wheel-retention details are represented schematically.
- Current minimum mass wording is session-dependent and includes nominal tyre mass separately; the code records the 726 kg qualifying and 724 kg other-session non-tyre anchors instead of presenting one stale universal number.

The model's scene scale is tied to the 3400 mm maximum wheelbase. Its front-wing width is now checked automatically against the 1900 mm bodywork envelope. These checks establish traceability, not CAD-level dimensional fidelity.

## Public team references

### Ferrari-style interpretation

Sources: [official SF-26 reveal](https://www.ferrari.com/en-EN/formula1/articles/ferrari-unveils-the-sf-26) and [official SF-26 overview](https://www.ferrari.com/en-CA/formula1/sf-26).

Public cues used: brighter gloss Rosso Scuderia, white around the cockpit and engine cover, push-rod suspension at both ends, 18-inch wheels and a 1.6-litre 90-degree V6 hybrid package.

### McLaren-style interpretation

Sources: [official MCL40 livery reveal](https://www.mclaren.com/racing/formula-1/2026/mclaren-racing-reveal-livery-for-the-mclaren-mastercard-formula-1-teams-2026-challenger/) and [official 2026 technical specification](https://www.mclaren.com/racing/formula-1/2026/what-is-the-technical-specification-of-our-2026-formula-1/).

Public cues used: papaya and anthracite, restrained teal highlights, carbon-composite construction, push-rod front and rear suspension, active front/rear aero, 18-inch magnesium wheels and an eight-speed transmission.

### Mercedes-style interpretation

Sources: [official W17 reveal](https://www.mercedesamgf1.com/news/mercedes-amg-f1-2026-challenger-w17-revealed), [official W17 technical specification](https://www.mercedesamgf1.com/f1-w17-2026-technical-specifications) and [official 2026 car explainer](https://www.mercedesamgf1.com/car/2026).

Public cues used: silver transitioning into deep black, a low PETRONAS-green-style flow line rendered without branding, rhombus texture over the sidepod/engine-cover region, push-rod suspension at both ends and an eight-speed transmission.

### Red Bull-style interpretation

Sources: [official RB22 season launch](https://www.redbullracing.com/int-en/races/season-launch-2026/), [official RB22 car page](https://www.redbullracing.com/int-en/cars/rb22) and [official 2026 season guide](https://www.redbullracing.com/int-en/f1-season-guide-2026).

Public cues used: gloss heritage white, deep navy areas, red/yellow high-contrast speed lines, a narrower active front wing, a three-element active rear wing, in-washing forward flow devices and the simpler 2026 floor/diffuser concept.

## Implementation notes

- Exterior livery geometry is procedural Three.js meshwork; no team image, texture, logo or sponsor asset is bundled.
- Livery selection is limited to the Grand Prix vehicle and persists in `localStorage` under `racecar-lab-grand-prix-livery`.
- The selector links to the corresponding official public reference and states the unofficial, logo-free boundary in both interface languages.
- Unit tests validate livery completeness, unique palettes and the FIA-traceable envelope; browser tests validate persistence and narrow portrait reachability.
