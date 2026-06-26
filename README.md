# Cooklang Shopper

<picture><img src="https://badges.ws/maintenance/yes/2026" /></picture>
<picture><img src="https://badges.ws/github/release/tmlmt/cooklang-shopper" /></picture>

Self-hosted, Nuxt-powered web app to manage cooklang recipes, create a shopping list, fill a cart with matching products and send it to an online store. Using the [`@tmlmt/cooklang-parser`](https://cooklang-parser.tmlmt.com/v3) Typescript parser, in its v3 version (alpha stage).

The app is currently in pre-v1 i.e beta version and in active development. Only recipe management (browsing, viewing, creating, editing) and shopping lists are functional at the moment while the rest is partially developed and therefore hidden an `experimental` flag. Feel free to test it out and report issues or feature requests.

## Features

### 🍳 Cooklang-native

- **File & folder based** — recipes live as plain `.cook` text files in regular directories — easy migration from/to other Cooklang-compatible tools
- **Full spec compatibility** — powered by [`@tmlmt/cooklang-parser`](https://cooklang-parser.tmlmt.com/v3), with support for many useful [extensions](https://cooklang-parser.tmlmt.com/v3/guide/extensions) such as references, recipe variants, alternative ingredients, etc.

### 📖 Recipe management

- **Browse recipes** — navigate your Cooklang recipe collection in a folder structure with grid or list view
- **View recipes** — read recipes with ingredients, cookware, preparation steps, metadata (tags, author, source, time), and variant support
- **Create, edit, move & delete recipes** — full CRUD with in-app Cooklang editor and syntax validation
- **Recipe images** — upload cover and per-step images, displayed in a carousel; powered by Nuxt Image with on-the-fly optimization
- **Servings scaling** — dynamically adjust ingredient quantities by changing the serving count
- **Recipe search** — fuzzy command-palette search across titles, tags, author, and description (<kbd>⌘/CTRL</kbd><kbd>K</kbd>)
- **Download `.cook` files** — export any recipe as a Cooklang file
- **Cook mode** — full-screen step-by-step walkthrough with swipe navigation, progress bar, per-step ingredients/cookware, and built-in countdown timers with browser notifications
- **AI recipe converter** — convert any recipe to Cooklang directly in the editor: import from a URL or paste raw text and let an AI model produce the `.cook` file (opt-in, compatible with OpenAI/LocalAI and Anthropic APIs)

### 🔗 Sharing & privacy

- **Per-recipe visibility** — mark individual recipes as public or private (configurable default)
- **Share links** — generate time-limited tokens that let anyone view a recipe without logging in
- **Public browsing** — optionally allow unauthenticated visitors to browse all public recipes
- **Atom feed** — expose public recipes via an Atom/XML feed for RSS readers and [federation](https://recipes.cooklang.org/about) (opt-in)

### ⚙️ General

- **🏠 Self-hosted** — runs on your own server with a single Node.js process and SQLite database
- **🔒 Role-based authentication** — two roles (editor and viewer) with password auth (scrypt-hashed) and/or OIDC single sign-on
- **🌗 Dark / light mode** — toggle between color themes
- **📱 Responsive design** — optimized for both desktop and mobile
- **Custom app title** — configurable application name shown in the header and SEO tags
- **🌍 Internationalization (i18n)** — multilingual UI and recipe content support. More details in the [Translation](#translations) section, including how to contribute.
- **🛡️ Security hardening** — built-in HTTP security headers (CSP with nonce, HSTS, X-Frame-Options), request size limiting, rate limiting, and SRI via [nuxt-security](https://nuxt-security.vercel.app/)

### 🛒 Shopping list

> Opt-in: requires `shopping.enabled: true` (or `"editor-only"`) in `config.yaml`.

- **User-specific list** — add recipes from the browse view with per-recipe serving adjustments; add or remove free-hand items not tied to any recipe
- **Store Run mode** — fullscreen checklist with a progress bar to tick off ingredients while shopping. Live updates of changes made by the list owner (e.g. new ingredients/recipes added) or any store runner (e.g. ingredients checked or unchecked).
- **Share links** — generate time-limited (or permanent) links that let anyone view your current shopping list without logging in; logged in users can edit it; all recipients can also use Store Run mode
- **Pantry management** — define a per-user pantry in TOML format; pantry items are automatically deducted from the shopping list so ingredients you already have at home never appear
- **Category configuration** — define a per-user ingredient categorization file to group shopping list items by aisle or category (e.g. Dairy, Bakery, Produce); uncategorized items fall into "Other"

### ⚠️ Experimental (not stable and not recommended for use)

> Requires `experimental: true` in `config.yaml`.

- **🛒 Shopping cart** — match aggregated ingredients against a product catalog (TOML-based) and identify unmatched items

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or later)

### Installation

1. Download the latest release tarball from the [releases page](https://github.com/tmlmt/cooklang-shopper/releases)
2. Extract it to your desired installation directory:
   ```bash
   mkdir -p /path/to/cooklang-shopper
   tar -xzf cooklang-shopper-v*.tar.gz -C /path/to/cooklang-shopper
   ```
3. Create your configuration file by copying the provided example:
   ```bash
   cd /path/to/cooklang-shopper/dist
   cp config.yaml.example config.yaml
   ```
4. Edit `config.yaml` — set the different parameters (see the file for instructions). For **password** authentication, generate hashed passwords for the editor and viewer roles:

   ```bash
   node hash-password.mjs <editor-password>
   node hash-password.mjs <viewer-password>
   ```

   For **OIDC** authentication, configure the `oidc` block with your identity provider's client credentials, issuer URL, and role mapping. Roles are assigned based on an OIDC claim in the token — either via scopes granted by the IdP or via group membership. See `config.yaml.example` for detailed examples of both strategies. Multiple OIDC providers can be configured, and password + OIDC can be enabled simultaneously.

   The `sessionSecret` field is required (minimum 32 characters). Generate one with:

   ```bash
   openssl rand -base64 32
   ```

   For OG image URL signing, set `NUXT_OG_IMAGE_SECRET` as an environment variable — add it to your `.env` file or process manager config (e.g. a pm2 ecosystem file). A secret is auto-generated at startup if omitted, but setting it explicitly ensures stable signed URLs across restarts. Alternatively, set `ogImageSecret` directly in `config.yaml`.

5. Add your `.cook` recipe files to `dist/public/recipes/`
6. Start the server once to initialize the database (created automatically at `dist/data/cooklang-shopper.db`)
7. Set up the systemd service:

   ```bash
   # Edit the service file to adjust User, WorkingDirectory, and ExecStart paths
   sudo cp /path/to/cooklang-shopper/dist/cooklang-shopper.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now cooklang-shopper
   ```

   Alternatively, start the server manually:

   ```bash
   cd /path/to/cooklang-shopper/dist
   node server/index.mjs
   ```

### Per-user data files

In line with the file-first approach of the cooklang ecosystem, shopping lists, pantry files and category configuration files are plain text files stored on the server. Each file is scoped to a specific user via a **user key** derived from their login credentials:

- For **password authentication**: `password-{username}` (dots in the username replaced with underscores)
- For **OIDC authentication**: `{provider}-{userId}` (dots in either part replaced with underscores)

| Feature         | Directory                 | Filename pattern                 | Format                  |
| --------------- | ------------------------- | -------------------------------- | ----------------------- |
| Shopping list   | `dist/public/recipes/`    | `.shopping-list.{userKey}`       | Cooklang shopping list  |
| Checked items   | `dist/public/recipes/`    | `.shopping-checked.{userKey}`    | Plain text              |
| Pantry          | `dist/public/pantry/`     | `pantry.{userKey}.conf`          | [TOML](https://toml.io) |
| Category config | `dist/public/categories/` | `category-config.{userKey}.conf` | Cooklang category DSL   |

The two latter ones can be edited in-app (Pantry page for the pantry; Category Config in the shopping list menu). You can also create or pre-populate them directly on the server before users log in. Refer to the [Cooklang conventions](https://cooklang.org/docs/conventions/) for the expected file formats.

### Upgrade

The release tarball includes an `upgrade.sh` script at the root of the installation directory. It downloads the latest release, replaces the application files, and restores your recipes, product catalog, and `config.yaml` automatically.

```bash
cd /path/to/cooklang-shopper
./upgrade.sh
```

Options:

- `--edge` — include pre-releases when finding the latest version
- `--tag <tag>` — download a specific version (e.g. `--tag v1.0.0`)

The previous version is kept in `dist.bak/` for easy rollback:

```bash
rm -rf dist && mv dist.bak dist
```

Rollback preserves all user data including the database. If a newer version added schema changes, the older version safely ignores them.

> **Note:** Stop the server before upgrading and restart it afterward.
>
> ```bash
> sudo systemctl stop cooklang-shopper
> ./upgrade.sh
> sudo systemctl start cooklang-shopper
> ```

## Roadmap

1. Finalize shopping cart features
2. Develop feature to send cart to a pre-configured online store

## Translations

### Features

Cooklang-Shopper has multiple internationalization (i18n) features:

- **Multilingual UI** (language switch via burger menu)
- **Per-recipe language variants**: recipes can be saved and displayed in multiple languages (switch via button next to the recipe title on the recipe details page)
  - File naming convention with a base recipe name <baseName>: `<baseName>.cook` is considered as the default variant, and `<baseName>.<lang>.cook` as the variant for locale `<lang>` which should be the 2-digit code of the language as per [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes). It is recommended to also specify the locale in the recipe frontmatter/metadata using the `locale` key, especially for the default variant.
- Possibility to select whether all the labels on a recipe details page should be displayed in the same locale as the recipe content, or as the UI.

### Contribution

Translations are managed via a public Crowdin project that you are welcome to contribute to.

- Project page / invite link: https://crowdin.com/project/cooklang-shopper/invite?h=40be1757be0533e87568e3721c162be52809579
- Translators can translate content and vote for existing translations to help select the best wording.

### Status

<!--TRANSLATION_STATUS_START-->

| Language    |                       Translation (%) |                      Proofreading (%) |
| ----------- | ------------------------------------: | ------------------------------------: |
| 🇩🇰 Dansk    |   ![90%](https://progress-bar.xyz/90) |   ![25%](https://progress-bar.xyz/25) |
| 🇺🇸 English  | ![100%](https://progress-bar.xyz/100) | ![100%](https://progress-bar.xyz/100) |
| 🇫🇷 Français | ![100%](https://progress-bar.xyz/100) | ![100%](https://progress-bar.xyz/100) |

<!--TRANSLATION_STATUS_END-->

## Screenshots

![Screenshot 01](screenshot-01.png)

![Screenshot 02](screenshot-02.png)
