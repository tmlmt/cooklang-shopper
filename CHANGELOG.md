# Changelog

## v0.13.2

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.13.1...v0.13.2)

### 🚀 Enhancements

- **CookMode:** Add close button ([130fb93](https://github.com/tmlmt/cooklang-shopper/commit/130fb93))
- **ModalFile:** Submit form when pressing Enter ([a8e98c4](https://github.com/tmlmt/cooklang-shopper/commit/a8e98c4))

### 🩹 Fixes

- **CookMode:** Make sure per step ingredients and preparation step match ([29b0ba0](https://github.com/tmlmt/cooklang-shopper/commit/29b0ba0))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.13.1

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.13.0...v0.13.1)

### 🩹 Fixes

- **ai:** Make apiKey optional for local provider ([8090e0e](https://github.com/tmlmt/cooklang-shopper/commit/8090e0e))

### 🏡 Chore

- **aiConverter:** Remove console.log ([d5d1f94](https://github.com/tmlmt/cooklang-shopper/commit/d5d1f94))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.13.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.12.3...v0.13.0)

### 🚀 Enhancements

- Ai conversion of recipes ([64bdebf](https://github.com/tmlmt/cooklang-shopper/commit/64bdebf))

### 🏡 Chore

- **README:** Update feature list and roadmap ([02e4c62](https://github.com/tmlmt/cooklang-shopper/commit/02e4c62))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.12.3

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.12.2...v0.12.3)

### 🔥 Performance

- **recipe:** Convert menuItems from computed to plain const ([2b5e0b0](https://github.com/tmlmt/cooklang-shopper/commit/2b5e0b0))

### 🩹 Fixes

- **recipe:** When yield default to servings value, put 'servings' in the plural only when > 1 ([0064339](https://github.com/tmlmt/cooklang-shopper/commit/0064339))
- **recipe:** Show header actions after saving new recipe ([0c679fb](https://github.com/tmlmt/cooklang-shopper/commit/0c679fb))
- **ModalFile:** Pre-select browsed directory when opening "new recipe" modal ([6e3c268](https://github.com/tmlmt/cooklang-shopper/commit/6e3c268))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.12.2

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.12.1...v0.12.2)

### 🩹 Fixes

- **directory:** Immediately show new directory after creating it ([273df3e](https://github.com/tmlmt/cooklang-shopper/commit/273df3e))
- **recipe:** Disable xss validation for recipe addition and edits ([30365b8](https://github.com/tmlmt/cooklang-shopper/commit/30365b8))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.12.1

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.12.0...v0.12.1)

### 🩹 Fixes

- **recipe:** Immediately show images after adding new recipe ([43ae996](https://github.com/tmlmt/cooklang-shopper/commit/43ae996))
- **directory:** Immediately show new directory after adding new recipe in it ([7ba49ab](https://github.com/tmlmt/cooklang-shopper/commit/7ba49ab))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.12.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.11.0...v0.12.0)

### ⚠️ Breaking Changes

- Recipe sharing API moved from `/api/sharing/*` to `/api/sharing/recipe/*`
- Shared recipe page URL changed from `/s/[token]` to `/s/r/[token]`

### 🚀 Enhancements

- **recipe:** Light placeholder for new recipe ([d697101](https://github.com/tmlmt/cooklang-shopper/commit/d697101))
- ⚠️ Add shopping list sharing and align api endpoint names for recipes and lists ([31c961c](https://github.com/tmlmt/cooklang-shopper/commit/31c961c))
- **shared-links:** Add sign in item to burger menu ([d11f87c](https://github.com/tmlmt/cooklang-shopper/commit/d11f87c))

### 🩹 Fixes

- **security:** Validate path in public recipe endpoint ([8625d8f](https://github.com/tmlmt/cooklang-shopper/commit/8625d8f))
- **security:** Validate max length of password to prevent DoS on login endpoint ([f29cc57](https://github.com/tmlmt/cooklang-shopper/commit/f29cc57))
- **recipe:** Servings defaults to 1 if undefined ([db15a80](https://github.com/tmlmt/cooklang-shopper/commit/db15a80))
- **recipe:** Do not try to fetch images for new recipes ([ba9612b](https://github.com/tmlmt/cooklang-shopper/commit/ba9612b))
- Return null instead of undefined ([9739aac](https://github.com/tmlmt/cooklang-shopper/commit/9739aac))
- **header:** Do not add action items nor menu items for recipes when creating a new one ([add52f8](https://github.com/tmlmt/cooklang-shopper/commit/add52f8))
- **shared-recipe:** Add cook mode for recipes accessed with public link ([6cce97b](https://github.com/tmlmt/cooklang-shopper/commit/6cce97b))
- **recipe:** Remove checkboxes from per-step ingredient list in cook mode and display over correct number of columns ([8b31814](https://github.com/tmlmt/cooklang-shopper/commit/8b31814))
- **feed:** Add cover image defined in recipe metadata and increase cache period to 10m ([dba12f0](https://github.com/tmlmt/cooklang-shopper/commit/dba12f0))

### 💅 Refactors

- Include baseUrl in public config and use it instead of window.location.origin ([875f812](https://github.com/tmlmt/cooklang-shopper/commit/875f812))
- Use status and statusText instead of deprecated statusCode and statusMessage for all createError calls ([33a86ac](https://github.com/tmlmt/cooklang-shopper/commit/33a86ac))

### 🏡 Chore

- **README:** Update with latest features ([40fee80](https://github.com/tmlmt/cooklang-shopper/commit/40fee80))
- **server, app:** Do not explicitely import auto-imported utils ([01c1dc5](https://github.com/tmlmt/cooklang-shopper/commit/01c1dc5))
- **ai:** Add commit-message skill for conventional commit drafting ([78be893](https://github.com/tmlmt/cooklang-shopper/commit/78be893))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.11.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.10.1...v0.11.0)

### 🚀 Enhancements

- **shoppingList:** Add and remove free-hand items ([4b72436](https://github.com/tmlmt/cooklang-shopper/commit/4b72436))
- **shoppingList:** Button to reset to original servings after temporary changes ([cc07298](https://github.com/tmlmt/cooklang-shopper/commit/cc07298))
- **shoppingList:** 'Store Run' Mode ([99c581b](https://github.com/tmlmt/cooklang-shopper/commit/99c581b))

### 🩹 Fixes

- Correctly initialize which recipes are in shopping list at page load ([5fbc6cf](https://github.com/tmlmt/cooklang-shopper/commit/5fbc6cf))
- **GridCard:** Prevent navigation after first tap on image on mobile ([3a7dbea](https://github.com/tmlmt/cooklang-shopper/commit/3a7dbea))

### 🏡 Chore

- Update tsbuildinfo ([c772555](https://github.com/tmlmt/cooklang-shopper/commit/c772555))

### 🎨 Styles

- **Header:** Turn cursor to pointer when hovering menu items ([803cd00](https://github.com/tmlmt/cooklang-shopper/commit/803cd00))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.10.1

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.10.0...v0.10.1)

### 🩹 Fixes

- **CookMode:** Restore passive list of ingredients over one or two columns ([23ff101](https://github.com/tmlmt/cooklang-shopper/commit/23ff101))

### 🏡 Chore

- **config:** Improve text ([ef05995](https://github.com/tmlmt/cooklang-shopper/commit/ef05995))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.10.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.9.1...v0.10.0)

### ⚠️ Breaking Changes

- shopping list access now depends on shopping.enabled (false, true, or editor-only); experimental no longer controls /list availability.
- session user payload now requires provider and userId fields; legacy sessions without them are cleared.

### 🚀 Enhancements

- **shopping:** ⚠️ Add API-backed, file-based, per-user shopping list and variant-aware choices ([aa359d7](https://github.com/tmlmt/cooklang-shopper/commit/aa359d7))

### 🏡 Chore

- Update tsbuildinfo file ([77a0b71](https://github.com/tmlmt/cooklang-shopper/commit/77a0b71))
- Typecheck ([8874f88](https://github.com/tmlmt/cooklang-shopper/commit/8874f88))

### 🎨 Styles

- **InputNumber:** Make slightly wider to accomodate X.X ([0cb9191](https://github.com/tmlmt/cooklang-shopper/commit/0cb9191))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.9.1

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.9.0...v0.9.1)

### 🩹 Fixes

- **security:** Allow display of images selected for upload ([45da2e6](https://github.com/tmlmt/cooklang-shopper/commit/45da2e6))
- **header:** Remove duplicate color mode item ([17db161](https://github.com/tmlmt/cooklang-shopper/commit/17db161))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.9.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.8.0...v0.9.0)

### ⚠️ BREAKING CHANGES

- **Config file restructured for multi-provider auth and roles.** The `password` field at the root of `config.yaml` has been replaced by an `auth.providers` array that supports multiple authentication providers (password and OIDC). Password authentication now requires **two** hashed passwords — one per role.

  Before:

  ```yaml
  password: "<scrypt-hashed-password>"
  ```

  After:

  ```yaml
  auth:
    providers:
      - type: password
        name: local
        config:
          password_editor: "<scrypt-hashed-password>"
          password_viewer: "<scrypt-hashed-password>"
  ```

- **Federation `baseUrl` moved to root level.** If you use federation, `sharing.federation.baseUrl` must be moved to the top-level `baseUrl` field (also required for OIDC).

  Before:

  ```yaml
  sharing:
    federation:
      baseUrl: "https://cookbook.example.com"
  ```

  After:

  ```yaml
  baseUrl: "https://cookbook.example.com"
  ```

- **Login API now requires a `role` field.** The `POST /api/auth/login` endpoint now expects `{ role, password }` instead of just `{ password }`. This only affects custom API clients — the built-in UI handles it automatically.

### 🚀 Enhancements

- ⚠️ Editor and viewer roles ([2a3eefd](https://github.com/tmlmt/cooklang-shopper/commit/2a3eefd))
- ⚠️ OIDC role-based authentication ([6ec170e](https://github.com/tmlmt/cooklang-shopper/commit/6ec170e))
- **seo:** Add global SEO meta and serve title via API ([1f43999](https://github.com/tmlmt/cooklang-shopper/commit/1f43999))

### 🩹 Fixes

- **type:** Correct location for definition of user session type ([25a75ea](https://github.com/tmlmt/cooklang-shopper/commit/25a75ea))

### 🎨 Styles

- **header:** Dynamic auth menu item always in burger menu ([c8aef15](https://github.com/tmlmt/cooklang-shopper/commit/c8aef15))
- **auth:** Remove dot and write profile name in bold ([37b5c7e](https://github.com/tmlmt/cooklang-shopper/commit/37b5c7e))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.8.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.7.3...v0.8.0)

### 🚀 Enhancements

- **recipe:** Add reset button to revert to original servings ([5d22df2](https://github.com/tmlmt/cooklang-shopper/commit/5d22df2))
- **recipe:** Cook mode ([55011bd](https://github.com/tmlmt/cooklang-shopper/commit/55011bd))
- Add nuxt-security module ([c6be05f](https://github.com/tmlmt/cooklang-shopper/commit/c6be05f))

### 🏡 Chore

- **README:** Update roadmap ([fc4bbba](https://github.com/tmlmt/cooklang-shopper/commit/fc4bbba))
- **README:** Add features section ([0be71b7](https://github.com/tmlmt/cooklang-shopper/commit/0be71b7))
- Update .nuxtrc ([4055797](https://github.com/tmlmt/cooklang-shopper/commit/4055797))
- **README:** Add latest features ([775c42a](https://github.com/tmlmt/cooklang-shopper/commit/775c42a))

### 🎨 Styles

- Change secondary color to cooklang orange ([89cc268](https://github.com/tmlmt/cooklang-shopper/commit/89cc268))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.7.3

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.7.2...v0.7.3)

### 💅 Refactors

- **header:** Improve handling of mobile vs desktop menus with separators ([91d88df](https://github.com/tmlmt/cooklang-shopper/commit/91d88df))

### 🎨 Styles

- **metadata:** Display author and source as inline text with natural word wrapping ([e2d5485](https://github.com/tmlmt/cooklang-shopper/commit/e2d5485))
- **breadcrumb:** Display inline and truncate start to try to limit to 1 line ([ae7f86f](https://github.com/tmlmt/cooklang-shopper/commit/ae7f86f))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.7.2

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.7.1...v0.7.2)

### 🩹 Fixes

- **menus:** Remove modal property of dropdown menu to prevent layout shift ([88c1284](https://github.com/tmlmt/cooklang-shopper/commit/88c1284))
- **recipe:** Add upload image item to menu ([c85a6c1](https://github.com/tmlmt/cooklang-shopper/commit/c85a6c1))

### 🎨 Styles

- **share:** Harmonize icon with rest of header actions ([ad0b62e](https://github.com/tmlmt/cooklang-shopper/commit/ad0b62e))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.7.1

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.7.0...v0.7.1)

### 🩹 Fixes

- **header:** Do not duplicate colormode and auth menu items on mobile ([9182ced](https://github.com/tmlmt/cooklang-shopper/commit/9182ced))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.7.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.6.2...v0.7.0)

### 🚀 Enhancements

- **feed:** Cache xml file for 60 s ([e4a020b](https://github.com/tmlmt/cooklang-shopper/commit/e4a020b))
- Download .cook file of individual recipes ([d817c72](https://github.com/tmlmt/cooklang-shopper/commit/d817c72))
- Search recipes ([1d45525](https://github.com/tmlmt/cooklang-shopper/commit/1d45525))

### 🏡 Chore

- **package:** Add format script and run prettier ([ba1e856](https://github.com/tmlmt/cooklang-shopper/commit/ba1e856))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.6.2

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.6.1...v0.6.2)

### 🚀 Enhancements

- **feed:** Add optional <subtitle> (i.e. description) field ([fac2516](https://github.com/tmlmt/cooklang-shopper/commit/fac2516))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.6.1

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.6.0...v0.6.1)

### 🩹 Fixes

- **package:** Include db migrations in the release tarball ([e27a9b8](https://github.com/tmlmt/cooklang-shopper/commit/e27a9b8))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.6.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.5.1...v0.6.0)

### 🚀 Enhancements

- Add, move, rename and delete folders ([626e09c](https://github.com/tmlmt/cooklang-shopper/commit/626e09c))
- Customize app title ([5b18fb8](https://github.com/tmlmt/cooklang-shopper/commit/5b18fb8))
- Multi sharing functionalities (share link, public/private recipes, Atom feed for federation) ([e922462](https://github.com/tmlmt/cooklang-shopper/commit/e922462))

### 🏡 Chore

- **README:** Minor clarification for creating config file ([a2b4e90](https://github.com/tmlmt/cooklang-shopper/commit/a2b4e90))
- **ai:** Use pnpx instead of npx ([7be0545](https://github.com/tmlmt/cooklang-shopper/commit/7be0545))
- **build:** Update tsbuildinfo ([5a16645](https://github.com/tmlmt/cooklang-shopper/commit/5a16645))
- **package:** Add typecheck script ([b4fadce](https://github.com/tmlmt/cooklang-shopper/commit/b4fadce))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.5.1

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.5.0...v0.5.1)

### 🩹 Fixes

- Correct remember long-term the user's view preference ([abce510](https://github.com/tmlmt/cooklang-shopper/commit/abce510))
- **recipe:** Prevent Back button from navigating to homepage and clean structure of left slot of Header ([d5c70cf](https://github.com/tmlmt/cooklang-shopper/commit/d5c70cf))

### 🏡 Chore

- **README:** Update screenshots ([bc4725b](https://github.com/tmlmt/cooklang-shopper/commit/bc4725b))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.5.0

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.4.1...v0.5.0)

### 🚀 Enhancements

- Display and manage images ([4c54f73](https://github.com/tmlmt/cooklang-shopper/commit/4c54f73))
- Change default view mode to grid ([68769e1](https://github.com/tmlmt/cooklang-shopper/commit/68769e1))

### 💅 Refactors

- **toaster:** Centralize duration to default value of 1600ms ([8bf9868](https://github.com/tmlmt/cooklang-shopper/commit/8bf9868))

### 🏡 Chore

- **vite:** Prebundle human-regex to avoid page reloads ([0ec43af](https://github.com/tmlmt/cooklang-shopper/commit/0ec43af))
- **ai:** Add reminder about proper use of fetch methods ([af4feb3](https://github.com/tmlmt/cooklang-shopper/commit/af4feb3))
- **security:** Protect static assets behind auth middleware ([7fb7eb3](https://github.com/tmlmt/cooklang-shopper/commit/7fb7eb3))
- **README:** Update roadmap ([5d5613e](https://github.com/tmlmt/cooklang-shopper/commit/5d5613e))

### 🎨 Styles

- **source:** Tiny adjustment in top margin ([fed8726](https://github.com/tmlmt/cooklang-shopper/commit/fed8726))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v0.4.1

[compare changes](https://github.com/tmlmt/cooklang-shopper/compare/v0.4.0...v0.4.1)

### 🎨 Styles

- **recipe:** Improve vertical margin distribution between upper blocks ([bb1d93b](https://github.com/tmlmt/cooklang-shopper/commit/bb1d93b))
- **header:** Add labels to action buttons on desktop ([a63708e](https://github.com/tmlmt/cooklang-shopper/commit/a63708e))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

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
