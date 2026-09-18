# Cut, Fold, Play icons

Archived alternative: Cut, Fold, Play. Enamel is the selected storefront style; these paper illustrations are retained for possible future use and are not served by the app.

The eleven ready-to-use 256px WebPs are in `assets/icon-studies/paper/icons/`. Generated with ImageGen on 18 September 2026 using the Azani concept as the style reference.

`assets/icon-studies/paper/source-atlas.png` preserves the original 1448 × 1086 transparent RGBA output. The requested 1536 × 1152 output was returned at 1448 × 1086, which retains the exact 4-column, 3-row square-cell grid. The adjacent `extract.mjs` reproducibly extracts its eleven 362 × 362 cells, crops each to its alpha bounds plus a 2px fringe, and fits each into a 228 × 228 area with 14px transparent margins, producing 256 × 256 WebP assets. The twelfth cell is empty. Alpha values above 8 determine cropping bounds; the alpha pixels themselves remain unchanged. No background removal, recolouring, or flood filling was performed.

Run from the repository root: `node assets/icon-studies/paper/extract.mjs`. This regenerates the archived `icons/` directory without adding files to `public/`.

## Generation prompt

Create one production sprite atlas based on the selected folded-paper icon reference. Four columns and three rows of equal square cells; actual transparent alpha background. Each isolated icon is centred with generous margins. Consistent front-facing perspective, simple silhouettes legible at navigation size, subtle paper folds and attached shadows. Coral pink, sky blue, mint, and warm pale yellow palette. Row 1: folded tee stack, coral dress, blue pocket tee, three ascending blank tabs. Row 2: folded yellow star, coral tag with heart-shaped cutout and no text, mint trousers, blue shirt-and-shorts outfit. Row 3: mint-and-blue hooded jacket, cream moon-print pyjama top and blue bottoms, blue sock pair with yellow cuffs and mint heels, empty final cell. No labels, letters, numbers, captions, dividers, grid, UI, background, or extra ornaments.
