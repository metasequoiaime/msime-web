# Cascadia Code

Unmodified variable WOFF2 fonts from Microsoft's [Cascadia Code v2407.24 release](https://github.com/microsoft/cascadia-code/releases/tag/v2407.24).

Source archive: https://github.com/microsoft/cascadia-code/releases/download/v2407.24/CascadiaCode-2407.24.zip

- `CascadiaCode.woff2`: `woff2/CascadiaCode.woff2`, normal, weights 200–700.
- `CascadiaCodeItalic.woff2`: `woff2/CascadiaCodeItalic.woff2`, italic, weights 200–700.

Licensed under SIL Open Font License 1.1. The upstream copyright notice and license are included in `public/fonts/cascadia-code/LICENSE.txt` and published at `/fonts/cascadia-code/LICENSE.txt`.

`src/app.css` loads these files for code typography. Vite emits hashed font assets so they use the existing immutable asset cache. Fonts are served from the site itself and loaded only when used; `font-display: swap` keeps text visible during loading. General UI text continues to use the system sans-serif stack.
