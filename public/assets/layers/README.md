# Parallax Layer Assets

Place transparent PNGs here for the hero parallax stack.

## Expected filenames (from `src/data/vtuber-data.ts`)

| File | Role | Suggested speed |
|------|------|-----------------|
| `hero-bg.png` | farthest background | `0.15` |
| `hero-mid.png` | environment / midground | `0.35` |
| `hero-character.png` | Mild-R character | `0.55` |
| `hero-fg.png` | foreground props | `0.85` |
| `hero-particles.png` | particles / sparks | `1.1` |

## How to swap from SVG placeholders

1. Add your PNG files into this folder (same base names as above).
2. Update each `parallax_layers[].src` in `src/data/vtuber-data.ts` from `.svg` → `.png`.
3. Keep transparent backgrounds on character / particle layers for clean stacking.

Current repo ships temporary SVG placeholders so motion works without final art.
