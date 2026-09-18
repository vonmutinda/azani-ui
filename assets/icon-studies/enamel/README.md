# Little Enamel Club icons

Generated with the built-in ImageGen tool on 2026-09-18, using the selected Little Enamel Club concept as a style reference. These are decorative storefront icons, with accessible names supplied by the consuming interface.

The eleven production files are 256 × 256 WebP images with preserved genuine alpha transparency. They are intended for navigation at 28–36 CSS pixels and category presentations at 64 CSS pixels. Motifs: wardrobe, dress, shirt, measuring tape, stars, hangtag, trousers, coordinated outfit, jacket, pyjamas, and socks. The measuring tape has ticks without numbers, and the hangtag has no lettering or logo.

`assets/icon-studies/enamel/enamel-atlas.png` preserves the original generated 1448 × 1086 transparent atlas outside the public directory. It has four columns and three rows of 362-pixel square cells; the final cell is empty. `assets/icon-studies/enamel/extract.mjs` splits the exact grid, crops each cell to its visual bounds with a margin, resizes, and encodes the individual files into `public/images/icons/enamel/`. It performs no painting, background erasure, or alpha replacement. Run it from the repository root with `node assets/icon-studies/enamel/extract.mjs`.

Generation prompt: Produce one production sprite atlas with a strict four-column, three-row grid and genuinely transparent alpha. Use the selected Little Enamel Club reference for glossy dimensional enamel, fine warm gold rims, and coral, sky, mint, and yellow colours. Center eleven isolated motifs in reading order: wardrobe, coral bow dress, blue pocket shirt, unnumbered measuring tape, two yellow stars, blank mint hangtag, mint trousers, coral shirt with yellow shorts, blue jacket, mint moon pyjamas, and coral/yellow socks. Leave the final cell empty. No labels, letters, numbers, logos, drawn checkerboard, or background. Preserve bold readable silhouettes for small navigation sizes.

Reference: `assets/icon-studies/enamel/reference.png`.

The first atlas was refined using ImageGen to reduce each motif by 30% and provide generous empty padding inside each grid cell. The refinement retained all eleven designs and the true alpha background. This avoids adjacent-cell fragments when extracting individual icons.
