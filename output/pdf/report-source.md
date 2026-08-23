# AETHER Major Upgrade Research Report

Computational Visual Laboratory
Created and curated by Biswajit Jana
Research and implementation baseline: 23 August 2026

## Executive decision

AETHER should evolve as a measured scientific-visual platform, not as a framework showcase. The current 80-study WebGL2 catalogue is a viable production foundation. The highest-value next step is to improve the truthfulness, measurability and delivery of that foundation before attempting a full renderer migration.

The recommended architecture is dual-track:

1. Keep Three.js WebGLRenderer as the stable default for the current catalogue.
2. Develop one isolated flagship study with WebGPURenderer and Three Shading Language (TSL).
3. Adopt WebGPU catalogue-wide only after parity tests cover materials, post-processing, screenshots, accessibility and representative devices.

This follows Three.js's own guidance: WebGPURenderer can fall back to WebGL2 and TSL can target WGSL or GLSL, but the renderer is still described as experimental and the established WebGL EffectComposer path does not transfer directly [S1, S2].

## What the repository audit found

- 80 deterministic studies and a coherent lazy-loading animation contract.
- 12 automated tests after this foundation upgrade, plus contract validation for all 80 studies.
- One shared WebGL2 renderer, correct sRGB output and ACES tone mapping.
- A production main bundle of approximately 786 KB minified / 207 KB gzip.
- Seven licensed soundtrack files totalling approximately 52 MB.
- Strong catalogue breadth, but scientific depth is uneven: only selected studies expose detailed model assumptions and validation-oriented metadata.
- A pre-existing adaptive-quality module was not connected to the live renderer.

The principal risk is therefore not the absence of another UI framework. It is the gap between a visually ambitious catalogue and a repeatable scientific/performance release standard.

## Evidence-to-decision matrix

| Area | Evidence | Decision |
| --- | --- | --- |
| Renderer | WebGPURenderer offers WebGPU with WebGL2 fallback, but remains experimental; WebGL EffectComposer is unsupported in that path [S1, S2]. | Keep WebGL2 stable; pilot WebGPU/TSL on one flagship study. |
| Runtime quality | Three.js exposes pixel-ratio controls and renderer.info draw, geometry and memory telemetry [S3]. High device-pixel ratios can multiply fragment cost substantially [S4]. | Measure frame time and adapt DPR with hysteresis; expose live workload metrics. |
| Numerical physics | Barnes-Hut reduces direct gravitational force evaluation from quadratic to O(N log N) [S5]. Symplectic methods provide superior long-time Hamiltonian energy behaviour [S6]. | Use symplectic/leapfrog integration for conservative orbital systems; introduce convergence and invariant gates; reserve Barnes-Hut for sufficiently large interacting sets. |
| Accessibility | WCAG 2.2 requires pause/stop control for long-running motion and alternatives to drag-only interaction; reduced-motion is a supported technique [S7, S8]. | Preserve visible pause, add keyboard/non-drag camera controls in Phase 2, and make reduced motion a tested runtime mode. |
| Audio | Audible playback generally requires a user gesture; HTMLMediaElement is suitable for long tracks; preload="none" avoids pre-consent media transfer [S9, S10]. | Attach soundtrack URLs only after Play; retain Web Audio for analysis, not bulk delivery. |
| Main-thread work | OffscreenCanvas can be transferred to a worker; PerformanceObserver exposes long-animation-frame evidence [S11, S12]. | Move thumbnail generation and CPU-heavy precomputation to workers after profiling identifies a bottleneck. |
| Experience performance | A good LCP is at most 2.5 seconds at the 75th percentile; architecture alone does not determine Core Web Vitals [S13, S14]. | Set budgets and measure. Do not rewrite in React/Tailwind without a demonstrated user or maintenance benefit. |

## Target platform architecture

### Stable WebGL2 catalogue

The existing renderer remains responsible for the 80 published studies. Each study continues to own its scene, camera, update, render, resize and disposal lifecycle. The host owns renderer quality, visibility suspension, audio, catalogue navigation and telemetry.

### Experimental WebGPU/TSL lane

Create an isolated capability route for one flagship model—recommended: a validated galaxy encounter or gravitational-wave field. It must have:

- a WebGL2 fallback;
- comparable colour management and output transforms;
- a documented post-processing replacement;
- deterministic seed and fixed-time frame export;
- device/feature detection and an explicit experimental badge;
- visual regression images for both backends.

### Scientific model contract

Every study claiming PHYSICS_MODEL status should publish:

- governing equations and dimensional/nondimensional units;
- initial and boundary conditions;
- integrator and fixed/adaptive step rule;
- softening, damping or phenomenological terms;
- conserved or monitored quantities;
- step-refinement result;
- a plain-language limitation statement;
- primary references.

Hamiltonian gravity and orbital models should default to leapfrog/velocity-Verlet or another justified symplectic scheme. RK4 remains appropriate for short, bounded visual trajectories where conservation is not the primary claim. Large gravitational systems should introduce Barnes-Hut only after direct-sum reference tests establish acceptable force error.

### Runtime observatory

The user-facing console should report measured FPS, p95 frame time, active quality profile, DPR, draw calls, point count and triangle count. Auto mode should change resolution only after sustained evidence, with separate thresholds for degradation and promotion. This prevents distracting oscillation.

## Upgrade roadmap

### Phase 1 — Foundation (implemented locally)

- Connected measured adaptive quality to the live renderer.
- Added Auto, Eco, Balanced and Studio quality modes.
- Added hysteresis and tests for sustained promotion/degradation.
- Added live FPS, p95 frame time, DPR, draw-call, point and triangle telemetry.
- Suspended the Three.js animation loop while the page is hidden.
- Changed soundtrack delivery to preload none and defer URL attachment until Play.
- Added reusable momentum, relative-drift, convergence-ratio and validation-summary utilities.
- Expanded the automated suite to 12 tests; all pass.

### Phase 2 — Scientific trust and interaction

- Add validation metadata and badges to every physics-labelled study.
- Reclassify visual metaphors that do not implement their title's physical process.
- Add keyboard camera orbit/zoom controls and explicit rotate buttons.
- Create golden invariant/convergence fixtures for galaxy, orbital, lattice and wave families.
- Replace heuristic thumbnails with deterministic fixed-time captures of the real renderer.

### Phase 3 — Flagship simulations

- Upgrade the Andromeda–Milky Way encounter with velocity-Verlet/leapfrog centre integration, parameter presets, separation/time plots and conservation readouts.
- Build a genuinely time-evolving binary-star model with centre-of-mass invariants.
- Build supernova expansion as an explicitly labelled Sedov-Taylor educational model, with regime limits visible.
- Add a Barnes-Hut comparison study only after direct-force error benchmarking.

### Phase 4 — Rendering and delivery

- Split the host/vendor bundle for durable caching; measure actual transfer and LCP before and after.
- Pilot WebGPURenderer + TSL on one flagship study.
- Move thumbnail rendering and heavy CPU precomputation to workers where profiling supports it.
- Establish desktop, integrated-GPU, mobile and reduced-motion browser matrices.
- Introduce visual regression thresholds and long-animation-frame capture in CI.

## Release gates

| Gate | Initial target |
| --- | --- |
| Catalogue integrity | 100% modules load; 0 contract errors/warnings |
| Numerical validity | Published tolerances pass; step refinement recorded |
| Frame delivery | p95 <= 20 ms desktop target; graceful Eco fallback when > 24 ms persists |
| Rendering workload | Draw/point/triangle telemetry present for every study |
| Accessibility | Pause works; reduced motion works; no essential drag-only operation |
| Audio | No audible autoplay; no bundled track URL attached before consent |
| Network | LCP <= 2.5 s at p75 on the selected deployment population |
| Determinism | Same seed + time + controls produces the same reference frame |

## What not to do

- Do not add React, Tailwind, a physics engine or WebGPU merely because each is fashionable.
- Do not call a decorative shader a physical simulation without equations, assumptions and validation.
- Do not increase particle counts before measuring frame time and GPU workload.
- Do not place the full 80-study catalogue behind an experimental renderer migration.
- Do not preload the 52 MB soundtrack collection for visitors who have not requested audio.

## Verification completed

- 12/12 automated tests passed.
- 80/80 study contracts passed with zero warnings.
- Production build succeeded.
- Live browser verification confirmed the 80-study interface, adaptive/manual quality state, real renderer telemetry, deferred audio source and zero console warnings/errors.

## Sources

- [S1] Three.js, WebGPURenderer: https://threejs.org/manual/en/webgpurenderer
- [S2] Three.js, WebGPU post-processing: https://threejs.org/manual/en/webgpu-postprocessing.html
- [S3] Three.js, WebGLRenderer documentation: https://threejs.org/docs/pages/WebGLRenderer.html
- [S4] Three.js, Responsive design and drawing-buffer sizing: https://threejs.org/manual/en/responsive.html
- [S5] Barnes & Hut, A hierarchical O(N log N) force-calculation algorithm, Nature 324 (1986): https://www.nature.com/articles/324446a0
- [S6] Symplectic integrators for Hamiltonian systems — basic theory: https://www.cambridge.org/core/services/aop-cambridge-core/content/view/A43D2E2B93A4A4FC8764AC276403C1D1/S0074180900091440a.pdf/symplectic-integrators-for-hamiltonian-systems-basic-theory.pdf
- [S7] W3C WCAG 2.2: https://www.w3.org/TR/WCAG/
- [S8] W3C technique C39, prefers-reduced-motion: https://www.w3.org/WAI/WCAG22/Techniques/css/C39
- [S9] MDN, Autoplay guide for media and Web Audio: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- [S10] MDN, HTMLMediaElement preload: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preload
- [S11] MDN, OffscreenCanvasRenderingContext2D: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvasRenderingContext2D
- [S12] MDN, Performance APIs: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API
- [S13] web.dev, Optimize Largest Contentful Paint: https://web.dev/articles/optimize-lcp
- [S14] web.dev, SPA and Core Web Vitals FAQ: https://web.dev/articles/vitals-spa-faq

## Conclusion

The best major upgrade is a credibility and observability upgrade first, followed by carefully selected flagship simulations. AETHER already has enough breadth. Its next level comes from making every scientific claim testable, every performance decision measurable and every experimental renderer reversible.
