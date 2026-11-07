# Claim OS interface

The visual thesis is the recovery desk: an overlooked notice becomes a sourced dossier, then a decision and an owner-controlled next step.

## Shared materials

All seven screens load `prototype/assets/polish.css` after their structural styles. Shared interactions live in `polish.js`. This keeps the existing engine and presenter selectors intact while bringing the surfaces into one design system.

- Soft white `#f8faf8` canvas, white documents, pale sage `#eff4ef` secondary surfaces.
- Forest `#215b43` primary actions and recovery green `#2c8056` for positive outcomes.
- Manrope for display and brand; DM Sans for body and controls. Monospace is reserved for references and small sequencing labels.
- Rounded documents and panels, subtle borders, restrained shadows. Avoid gradients, dense technical labels, raw JSON, and unsupported success claims in product screens.
- Mobile navigation is an accessible Menu disclosure, with Escape to close. Product flows remain accessible through their named controls.

## Motion

The landing notice-to-dossier preview cycles through Find, Prove and Prepare. The mechanism draws source-to-fact provenance, and the recovery story advances through scroll-linked beats. The presenter uses explicit next-stage controls and retains natural voice pacing. Reduced-motion users receive immediate state transitions.

## Demonstration boundaries

The website and presenter use illustrative case data. The Qualify panel runs the real rules engine against synthetic properties with an offline reviewer. Filing and payment in the presenter are simulated. Keep these boundaries visible and do not describe demonstration metrics as verified business outcomes.

## Verification

Check all seven routes at desktop and phone widths. Exercise navigation, theme, provenance replay, proof details, qualification, intake, and the presenter’s approve/reject/restart/activity paths. Inspect transcript timestamps and dossier scrolling at the approval step. Preserve keyboard shortcuts and voice controls.
