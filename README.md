This README is AI-generated.

# Simple Pendulum · Determining g

Static, offline-ready lesson site for the college physics practical **Simple pendulum: acceleration due to gravity from a T² against L graph**.

https://sonicunligmated.github.io/simple-pendulum-lesson/

## Sections

1. Aim & outcomes (aim, learning outcomes, medical perspectives)
2. Theory (forces on the bob with an angle slider, small-angle check, derivation of T = 2π√(L/g) and T² = (4π²/g)L, two-pendulum comparison of length, mass, angle and gravity)
3. Method (apparatus, clickable steps with illustrations, good practice)
4. Formula & results (worked example with readings calculated for ideal small-angle swings, g = 980 cm/s²: S ≈ 0.04027 s²/cm; cm/s² to m/s²)
5. Graph (hover to highlight readings; slope from the outer points, the inner points, or least squares; optional g = 980 reference line)
6. MCQs (20 questions, choices reshuffled on load and on reset)
7. Practical (front view with the pendulum hanging in front of the stand rod, which carries the cm scale, a rotary length knob on the clamp (drag, wheel or arrow keys; 0.5 cm steps, 0.1 cm with Shift), draggable length marker and bob, stopwatch with oscillation counter, slow motion, Auto-count 10 toggle, table that starts empty, pick-two-points or drag-a-line graph, Calculation with Check and nudges, guided calculation, automated tutorial)

## Practical model

The simulation integrates θ'' = −(g/L) sin θ (RK4, 2 ms steps, very light damping) with g = 980 cm/s², so large release angles really do lengthen the period.
The stopwatch reads simulation time, so slow motion does not change readings. By hand, an oscillation is counted each time the bob crosses the centre mark moving right.
Touching the bob or string while the timer runs stops it; a reading already frozen after 10 oscillations is left alone.
With Auto-count 10 on, every release resets the timer, starts it, counts 10 returns to the release point and freezes the reading.
The tutorial button runs a paced demo (20, 40, 60, 80 cm → table → graph → calculation) that can be paused, slowed down, stepped forward or back (Previous step / Next step, or the ← → keys) and stopped.

## Files

- `index.html`: hash-routed views
- `css/styles.css`, `css/fonts.css`: fog, pine and brass theme; fonts self-hosted in `fonts/` (Instrument Serif, Hanken Grotesk, JetBrains Mono, Gochi Hand; SIL OFL)
- `js/app.js`: all interactivity, no dependencies
