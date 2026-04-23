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
- **🛡️ Security hardening** — built-in HTTP security headers (CSP with nonce, HSTS, X-Frame-Options), request size limiting, rate limiting, and SRI via [nuxt-security](https://nuxt-security.vercel.app/)

### 🛒 Shopping list

> Opt-in: requires `shopping.enabled: true` (or `"editor-only"`) in `config.yaml`.

- **User-specific list** — add recipes from the browse view with per-recipe serving adjustments; add or remove free-hand items not tied to any recipe
- **Store Run mode** — fullscreen checklist with a progress bar to tick off ingredients while shopping

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

1. ~~Multi-role (admin, editor, viewer) authorization incl. support for OIDC~~ (done — editor/viewer roles with password & OIDC support)
2. Internationalization (i18n)
3. Finalize shopping list features
4. Finalize shopping cart features
5. Develop feature to send cart to a pre-configured online store
6. Add customization possibilities

## Screenshots

![Screenshot 01](screenshot-01.png)

![Screenshot 02](screenshot-02.png)
