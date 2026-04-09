# Changelog

## v0.4.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.3.0...v0.4.0)

### 🚀 Enhancements

- **auth:** Persist cookie for 1 week ([c5c2796](https://github.com/tmlmt/cooklang-shopper/commit/c5c2796))

### 🩹 Fixes

- **edit:** Prevent autocorrect, autocapitalize and spellcheck when editing cooklang ([c8b46fc](https://github.com/tmlmt/cooklang-shopper/commit/c8b46fc))

### 💅 Refactors

- Move metadata rendering to separate component ([32751d1](https://github.com/tmlmt/cooklang-shopper/commit/32751d1))

### 🏡 Chore

- **README:** Update roadmap ([c0e218c](https://github.com/tmlmt/cooklang-shopper/commit/c0e218c))
- **metadata:** Rename hidden/nonTitle keys to standard/nonStandard ([f275032](https://github.com/tmlmt/cooklang-shopper/commit/f275032))
- Update tsbuildinfo file ([1151b0f](https://github.com/tmlmt/cooklang-shopper/commit/1151b0f))

### 🎨 Styles

- Move recipe actions to header on recipe details page ([93a9bcc](https://github.com/tmlmt/cooklang-shopper/commit/93a9bcc))
- **recipe:** Improve rendering of author and source ([697f64e](https://github.com/tmlmt/cooklang-shopper/commit/697f64e))
- **metadata:** Make tags badges fully rounded to be consistent across the app ([540d05e](https://github.com/tmlmt/cooklang-shopper/commit/540d05e))
- **recipe:** Decrease size of scale spinner ([d88678f](https://github.com/tmlmt/cooklang-shopper/commit/d88678f))
- **metadata:** Display time in separate grid ([0b49b19](https://github.com/tmlmt/cooklang-shopper/commit/0b49b19))
- **metadata:** Move all non standard metadata to a collapsible ([788fd81](https://github.com/tmlmt/cooklang-shopper/commit/788fd81))
- **recipe:** Move author/source up and scale/variants down ([8072917](https://github.com/tmlmt/cooklang-shopper/commit/8072917))
- **recipe:** Decrease text size of breadcrumb on mobile ([6bd1458](https://github.com/tmlmt/cooklang-shopper/commit/6bd1458))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.3.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.2.1...v0.3.0)

### 🚀 Enhancements

- Grid view with major other related improvements ([8550212](https://github.com/tmlmt/cooklang-shopper/commit/8550212))
- **recipe/Metadata:** Hide yield/servings/variants, show tags as badges and render introduction/description directly as text ([a288758](https://github.com/tmlmt/cooklang-shopper/commit/a288758))

### 🩹 Fixes

- **layout:** Do not show footer if no navigation choices are shown ([aec4ead](https://github.com/tmlmt/cooklang-shopper/commit/aec4ead))

### 🤖 CI

- **release:** Allow forcing bump to major version ([9a5ed3f](https://github.com/tmlmt/cooklang-shopper/commit/9a5ed3f))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.2.1

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.2.0...v0.2.1)

### 🏡 Chore

- **cookbook:** Add grid/list view mode selector for future use ([4db5673](https://github.com/tmlmt/cooklang-shopper/commit/4db5673))

### 🎨 Styles

- **cookbook:** Slightly increase subtitle size ([e9f48bd](https://github.com/tmlmt/cooklang-shopper/commit/e9f48bd))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.2.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.16...v0.2.0)

### 🚀 Enhancements

- Display urls as links in metadata values ([99f3376](https://github.com/tmlmt/cooklang-shopper/commit/99f3376))
- Add cookbook subtitle, number of items and + button on mobile ([2f983be](https://github.com/tmlmt/cooklang-shopper/commit/2f983be))
- **list:** Alphabetical sorting of titles ([c278834](https://github.com/tmlmt/cooklang-shopper/commit/c278834))

### 🔥 Performance

- Only fetch recipe index once ([688fc38](https://github.com/tmlmt/cooklang-shopper/commit/688fc38))

### 🏡 Chore

- **useCatalogStore:** Do not use useFetch in store ([ceee229](https://github.com/tmlmt/cooklang-shopper/commit/ceee229))

### 🎨 Styles

- **index:** Merge dropdown menu on page into header menu ([a929691](https://github.com/tmlmt/cooklang-shopper/commit/a929691))
- **list:** Display tags as badges ([4d9f1e7](https://github.com/tmlmt/cooklang-shopper/commit/4d9f1e7))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.16

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.15...v0.1.16)

### 🩹 Fixes

- **About:** Fetching of latest version number ([d82ec4c](https://github.com/tmlmt/cooklang-shopper/commit/d82ec4c))
- Clear index before rebuilding ([0aabdb6](https://github.com/tmlmt/cooklang-shopper/commit/0aabdb6))
- **api/catalog:** Return initialized product catalog ([b5be17d](https://github.com/tmlmt/cooklang-shopper/commit/b5be17d))
- **pathJoin:** Normalize sanitized path parts ([a8a90f7](https://github.com/tmlmt/cooklang-shopper/commit/a8a90f7))
- **path:** Replace all + by a space and not just the first one ([54487e3](https://github.com/tmlmt/cooklang-shopper/commit/54487e3))
- **security:** Improve validation of path and dir across the repo ([177a031](https://github.com/tmlmt/cooklang-shopper/commit/177a031))
- **shoppingCart, shoppingList:** Prevent race conditions when multiple successive updates ([4ba8ed0](https://github.com/tmlmt/cooklang-shopper/commit/4ba8ed0))
- Prevent server from crashing when indexing malformed .cook files ([31a2005](https://github.com/tmlmt/cooklang-shopper/commit/31a2005))

### 🏡 Chore

- **README:** Fix and improve link to docs ([d06c9f3](https://github.com/tmlmt/cooklang-shopper/commit/d06c9f3))
- **html:** Add htmlAttr:lang ([2284cb9](https://github.com/tmlmt/cooklang-shopper/commit/2284cb9))
- **shoppingStore:** Remove console.log statements ([5b4372c](https://github.com/tmlmt/cooklang-shopper/commit/5b4372c))
- **misMatchReasonToText:** Remove dead code ([1a5ffeb](https://github.com/tmlmt/cooklang-shopper/commit/1a5ffeb))
- Add vue-tsc for typecheck and fix found issues ([32b889d](https://github.com/tmlmt/cooklang-shopper/commit/32b889d))
- **types:** Move file to shared/ dir ([814c635](https://github.com/tmlmt/cooklang-shopper/commit/814c635))
- **recipe:** Add explicit click handler to the Back button ([00a9f9f](https://github.com/tmlmt/cooklang-shopper/commit/00a9f9f))
- **release:** Add nuxt typecheck to build tests ([e26abd7](https://github.com/tmlmt/cooklang-shopper/commit/e26abd7))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.15

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.14...v0.1.15)

### 🩹 Fixes

- Latest version data fetching ([be8f631](https://github.com/tmlmt/cooklang-shopper/commit/be8f631))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.14

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.13...v0.1.14)

### 🩹 Fixes

- Secure all api endpoints ([ad186ef](https://github.com/tmlmt/cooklang-shopper/commit/ad186ef))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.13

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.12...v0.1.13)

### 🚀 Enhancements

- **servingsSpinner:** Do not focus on change ([3e0dd38](https://github.com/tmlmt/cooklang-shopper/commit/3e0dd38))
- **servingsSpinner:** Adapt step to original servings value ([dd1981b](https://github.com/tmlmt/cooklang-shopper/commit/dd1981b))
- **recipe:** Render cookware ([a42cb28](https://github.com/tmlmt/cooklang-shopper/commit/a42cb28))
- **Header:** Add About modal ([5259873](https://github.com/tmlmt/cooklang-shopper/commit/5259873))
- **recipe:** Move back button up to header ([40a4e1c](https://github.com/tmlmt/cooklang-shopper/commit/40a4e1c))
- Add close on 'Esc' to all modals ([ffaf61e](https://github.com/tmlmt/cooklang-shopper/commit/ffaf61e))

### 🩹 Fixes

- **seo:** Align description and fix titles ([969ca1a](https://github.com/tmlmt/cooklang-shopper/commit/969ca1a))

### 🎨 Styles

- **recipe:** Put title in bold ([3c894b5](https://github.com/tmlmt/cooklang-shopper/commit/3c894b5))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.12

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.11...v0.1.12)

### 🎨 Styles

- **metadata:** Improved alignment of list of objects ([0bf3a1c](https://github.com/tmlmt/cooklang-shopper/commit/0bf3a1c))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.11

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.10...v0.1.11)

### 🩹 Fixes

- Parsing and rendering of list of objects as metadata variable ([c351a70](https://github.com/tmlmt/cooklang-shopper/commit/c351a70))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.10

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.9...v0.1.10)

### 🏡 Chore

- **ai:** Instruct use of types.ts for shared types ([0a617b9](https://github.com/tmlmt/cooklang-shopper/commit/0a617b9))

### 🎨 Styles

- **ui:** Improved display on mobile ([7af5e81](https://github.com/tmlmt/cooklang-shopper/commit/7af5e81))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.9

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.8...v0.1.9)

### 🩹 Fixes

- **layout:** Center auth container ([94d978b](https://github.com/tmlmt/cooklang-shopper/commit/94d978b))

### 🏡 Chore

- **auth:** Add link to homepage ([eb4d95c](https://github.com/tmlmt/cooklang-shopper/commit/eb4d95c))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.8

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.7...v0.1.8)

### 🩹 Fixes

- **ingredients:** Handle subgroups of grouped ingredients ([a90dd68](https://github.com/tmlmt/cooklang-shopper/commit/a90dd68))

### 💅 Refactors

- Store recipes with Pinia and fix reactivity of recipe list ([d8d5466](https://github.com/tmlmt/cooklang-shopper/commit/d8d5466))

### 🏡 Chore

- **ai:** Instruct to use pnpm ([9332864](https://github.com/tmlmt/cooklang-shopper/commit/9332864))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.7

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.6...v0.1.7)

### 🩹 Fixes

- **runtime:** Avoid copying and dereference symlinks during archiving with tar ([c8d0d00](https://github.com/tmlmt/cooklang-shopper/commit/c8d0d00))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.6

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.5...v0.1.6)

### 🩹 Fixes

- **runtime:** Dereference symlinks when copying build dir to staging dir ([2622860](https://github.com/tmlmt/cooklang-shopper/commit/2622860))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.5

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.4...v0.1.5)

### 🩹 Fixes

- **runtime:** Revert inline bundling and switch to systemd ([8063269](https://github.com/tmlmt/cooklang-shopper/commit/8063269))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.4

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.3...v0.1.4)

### 🩹 Fixes

- **build:** Inline all dependencies likely leading to ESM/CJS resolution errors ([0a80c74](https://github.com/tmlmt/cooklang-shopper/commit/0a80c74))

### 🏡 Chore

- **config:** Replace example secret by placeholder ([a4041d6](https://github.com/tmlmt/cooklang-shopper/commit/a4041d6))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.3

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.2...v0.1.3)

### 🩹 Fixes

- **build:** Also inline chokidar's dependencies ([062082c](https://github.com/tmlmt/cooklang-shopper/commit/062082c))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.2

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.1...v0.1.2)

### 🩹 Fixes

- **build:** Inline chokidar into the bundle to avoid ESM resolution issues ([7664617](https://github.com/tmlmt/cooklang-shopper/commit/7664617))
- Create nuxt-auth-utils secret env var from config.yaml file ([57b5556](https://github.com/tmlmt/cooklang-shopper/commit/57b5556))
- **subdir:** Create recipes folder if it does not exist ([0773b00](https://github.com/tmlmt/cooklang-shopper/commit/0773b00))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.1

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.1.0...v0.1.1)

### 🩹 Fixes

- **has-password:** Better, no-dep call of scrypt ([97b77d6](https://github.com/tmlmt/cooklang-shopper/commit/97b77d6))
- **auth-utils:** Declare module in a .d.ts file ([bee67c7](https://github.com/tmlmt/cooklang-shopper/commit/bee67c7))
- **hash-password:** Convert to js file and include in release tarball ([eb6ea03](https://github.com/tmlmt/cooklang-shopper/commit/eb6ea03))

### 🏡 Chore

- **lint:** Extend scope of lint to scripts and types ([3771f13](https://github.com/tmlmt/cooklang-shopper/commit/3771f13))

### 🤖 CI

- Bump pnpm to v10.33.0 and node to v24 ([d9168eb](https://github.com/tmlmt/cooklang-shopper/commit/d9168eb))
- Add .nvmrc ([952cd85](https://github.com/tmlmt/cooklang-shopper/commit/952cd85))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.1.0

🚀 First public release
