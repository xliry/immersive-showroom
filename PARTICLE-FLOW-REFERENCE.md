# Dreamy Particle Variants — Reference Contract

- Mode: inspiration-only
- Primary reference: Codrops, “Crafting a Dreamy Particle Effect with Three.js and GPGPU” (2024-12-19)
- Source implementation reviewed: `DGFX/codrops-dreamy-particles`
- Target: `/particle-variants.html` and `/particle-v1.html` … `/particle-v6.html`
- Preserve: GPU position/velocity feedback, attraction to the source surface, velocity relaxation, localized perturbation, velocity-linked luminosity, additive glow
- Deliberate change: mouse-driven force becomes a time-driven automatic force field suitable for a loading experience
- Hyundai-specific target: Accent surface points, current ad framing, existing typography and disclosure
- Exclude: reference models, copy, colors, logos, layout, and source code duplication
- Acceptance evidence: six distinct motion signatures, continuous motion without input, recognizable gathered vehicle, responsive fit, consecutive-frame canvas delta

| ID | Variant | Automatic force field | Visual signature | Full page |
|---|---|---|---|---|
| 01 | Orbit Wake | Elliptical roaming repulsor | A luminous wake circles and dents the body | `/particle-v1.html` |
| 02 | Liquid Sweep | Nose-to-tail traveling wave | Layered liquid bands cross the surface | `/particle-v2.html` |
| 03 | Vortex Bloom | Vertical curl plus pulsing lift | Particles spiral outward and flower back | `/particle-v3.html` |
| 04 | Breathing Aura | Radial inhale/exhale shell | The whole silhouette breathes continuously | `/particle-v4.html` |
| 05 | Scan Assemble | Moving slice with gated attraction | The car repeatedly resolves along a scan plane | `/particle-v5.html` |
| 06 | Twin Magnet | Counter-orbiting dual repulsors | Two energy knots create a figure-eight flow | `/particle-v6.html` |

## Mapping

| Reference unit | Target implementation | Action | Verification |
|---|---|---|---|
| Position feedback texture | `GPUComputationRenderer` position variable | Adapt | WebGL render and build smoke |
| Velocity feedback texture | `GPUComputationRenderer` velocity variable | Adapt | Persistent movement after gather |
| Original mesh attraction | Accent surface-position texture | Adapt | Vehicle silhouette remains readable |
| Mouse repel force | Six time-driven GLSL force fields | Replace | Motion continues with no input |
| Velocity-linked alpha | Velocity-linked size, alpha, and color energy | Adapt | Brightness follows motion peaks |
| Additive point rendering | Soft dual-core particle sprite | Adapt | Luminous field without copied post FX |

