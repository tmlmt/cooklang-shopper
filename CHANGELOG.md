# Changelog

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
