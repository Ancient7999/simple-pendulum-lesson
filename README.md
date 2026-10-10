This README is AI-generated.

# Simple Pendulum · Determining g

Static, offline-ready lesson site for the college physics practical **Simple pendulum: acceleration due to gravity from a T² against L graph**.

https://sonicunligmated.github.io/simple-pendulum-lesson/

## Sections

1. Aim & outcomes (aim, learning outcomes, medical perspectives)
2. Theory (forces on the bob with an angle slider, small-angle check, derivation of T = 2π√(L/g) and T² = (4π²/g)L, two-pendulum comparison of length, mass, angle and gravity)
3. Method (apparatus, clickable steps with illustrations, good practice)
4. Formula & results (worked example: L = 20–80 cm, T₁₀ = 10, 14, 16, 18 s; S = 0.03 s²/cm; g ≈ 1315.95 cm/s²; cm/s² to m/s²)
5. Graph (hover to highlight readings; slope from two points, from the end points, or least squares; optional g = 980 reference line)
6. MCQs (20 questions, choices reshuffled on load and on reset)
7. Practical (draggable length and bob, live pendulum, stopwatch with oscillation counter, slow motion and auto-count 10, editable table, pick-two-points or drag-a-line graph, Check with nudges, guided calculation)

## Practical model

Real mode integrates θ'' = −(g/L) sin θ (RK4, 2 ms steps, very light damping) with g = 980 cm/s², so large release angles really do lengthen the period.
Lab mode uses an effective g(L) = 4π²L / T²(L), with T²(L) interpolated through the recorded readings, so 10 oscillations at 20, 40, 60 and 80 cm take 10, 14, 16 and 18 s.
The stopwatch reads simulation time, so slow motion does not change readings. An oscillation is counted each time the bob crosses the centre mark moving right.

## Files

- `index.html`: hash-routed views
- `css/styles.css`, `css/fonts.css`: fog, pine and brass theme; fonts self-hosted in `fonts/` (Instrument Serif, Hanken Grotesk, JetBrains Mono, Gochi Hand; SIL OFL)
- `js/app.js`: all interactivity, no dependencies
