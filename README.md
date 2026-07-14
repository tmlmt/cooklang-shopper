# Cooklang Shopper

<picture><img src="https://badges.ws/maintenance/yes/2026" /></picture>
<picture><img src="https://badges.ws/github/release/tmlmt/cooklang-shopper" /></picture>

Self-hosted, Nuxt-powered web app to manage cooklang recipes, create a shopping list, fill a cart with matching products and send it to an online store. Using the [`@tmlmt/cooklang-parser`](https://cooklang-parser.tmlmt.com/v3) Typescript parser, in its v3 version (alpha stage).

The app is currently in pre-v1 and in active development. Recipe management (browsing, viewing, creating, editing), shopping lists and the shopping cart (product catalog, cart matching and online store integration) are functional, and versions v0.19+ can be considered as release candidates for v1. Feel free to test it out and report issues or feature requests.

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
- **🔒 Role-based authentication** — three roles (admin, editor and viewer) with password auth (scrypt-hashed), OIDC single sign-on, and/or invite-based Google/Microsoft accounts managed from an in-app admin page
- **🌗 Dark / light mode** — toggle between color themes
- **📱 Responsive design** — optimized for both desktop and mobile
- **Custom app title** — configurable application name shown in the header and SEO tags
- **🌍 Internationalization (i18n)** — multilingual UI and recipe content support. More details in the [Translation](#translations) section, including how to contribute.
- **🛡️ Security hardening** — built-in HTTP security headers (CSP with nonce, HSTS, X-Frame-Options), request size limiting, rate limiting, and SRI via [nuxt-security](https://nuxt-security.vercel.app/)

### 📝 Shopping list

> Opt-in: requires `shopping.enabled: true` (or `"editor-only"`) in `config.yaml`.

- **User-specific list** — add recipes from the browse view with per-recipe serving adjustments; add or remove free-hand items not tied to any recipe
- **Store Run mode** — fullscreen checklist with a progress bar to tick off ingredients while shopping. Live updates of changes made by the list owner (e.g. new ingredients/recipes added) or any store runner (e.g. ingredients checked or unchecked).
- **Share links** — generate time-limited (or permanent) links that let anyone view your current shopping list without logging in; logged in users can edit it; all recipients can also use Store Run mode
- **Pantry management** — define a per-user pantry in TOML format; pantry items are automatically deducted from the shopping list so ingredients you already have at home never appear
- **Category configuration** — define a per-user ingredient categorization file to group shopping list items by aisle or category (e.g. Dairy, Bakery, Produce); uncategorized items fall into "Other"

### 🛒 Shopping cart

> Opt-in: requires `cart.enabled: true` (or `"editor-only"`) in `config.yaml`. Requires the Shopping list feature to also be enabled.

- **Product catalog** — maintain a per-user product catalog (TOML-based) mapping store products to ingredients
- **Cart matching** — match aggregated shopping-list ingredients against the catalog to build a priced cart, and surface unmatched ingredients with the reason they could not be matched
- **Online store integration** — connect to a supported online store and send the matched cart straight to its basket. Subsequent changes to the shopping list are synced as a diff, so the store basket always mirrors your cart

#### Online store adapters

Online stores are supported through small **adapters**. Only [nemlig.com](https://www.nemlig.com/) ships today, but adding another store is straightforward:

1. Create `server/utils/onlineStore/adapters/<your-store>.ts` exporting an object that implements the `OnlineStoreAdapter` interface (`server/utils/onlineStore/types.ts`). You need to provide:
   - `id` — the provider id used in `config.yaml`
   - `rateLimitMs` — minimum delay enforced between sequential store calls
   - `login(credentials, ctx)` — authenticate and return a `StoreSession`
   - `addToBasket(session, productId, quantity, ctx)` — add a quantity of a product
   - `removeFromBasket(session, productId, quantity, ctx)` — remove a quantity of a product
2. Register it in `server/utils/onlineStore/adapters/index.ts`.
3. Use the store's own product IDs as the keys in the product catalog, so matched products map directly to basket items.
4. Always perform outbound HTTP calls through the provided `safeFetch` helper (SSRF protection). For cookie-session stores (the most common case), the `adapterHelpers.ts` module provides two ready-made utilities:
   - `cookieHeader(session)` — converts stored `Set-Cookie` values into a `Cookie` request header
   - `jsonPost(url, body, session?, options?)` — performs a JSON POST, attaches the cookie session if provided, and throws a 502 on non-OK responses. Pass `options.extractError` to parse a store-specific error field from the response body.
5. Open a pull request so others can benefit from it.

Credentials are only used to open a session with the store and are never persisted, logged or returned to the client.

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

   To also enable **admin** login via password, add a `password_admin` entry and generate a hashed password for it:

   ```bash
   node hash-password.mjs <admin-password>
   ```

   A password admin can access the User Management page and invite other users (requires Google or Microsoft to also be configured).

   For **OIDC** authentication, configure the `oidc` block with your identity provider's client credentials, issuer URL, and role mapping. Roles are assigned based on an OIDC claim in the token — either via scopes granted by the IdP or via group membership. See `config.yaml.example` for detailed examples of both strategies. Multiple OIDC providers can be configured, and password + OIDC can be enabled simultaneously.

   For **Google / Microsoft** authentication (invite-based accounts), see the [Account providers](#account-providers-google--microsoft) section below.

   The `sessionSecret` field is required (minimum 32 characters). Generate one with:

   ```bash
   openssl rand -base64 32
   ```

   > **Session revocation:** Changing `sessionSecret` immediately invalidates **all** active sessions for every provider. This is the only way to force a global logout for password and generic OIDC users. Google/Microsoft (account) sessions are also revoked automatically when a user is deleted or deactivated — no secret rotation needed for those.

   For OG image URL signing, set `NUXT_OG_IMAGE_SECRET` as an environment variable — add it to your `.env` file or process manager config (e.g. a pm2 ecosystem file). A secret is auto-generated at startup if omitted, but setting it explicitly ensures stable signed URLs across restarts. Alternatively, set `ogImageSecret` directly in `config.yaml`.

5. Add your `.cook` recipe files to `dist/public/recipes/`
6. Start the server once to initialize the database (created automatically at `dist/data/cooklang-shopper.db`):

   ```
   cd /path/to/cooklang-shopper/dist
   node server/index.mjs
   ```

7. For a persistent setup (launch at startup), set up a systemd service using the provided example:

   ```bash
   # Edit the service file to adjust User, WorkingDirectory, and ExecStart paths
   sudo cp /path/to/cooklang-shopper/dist/cooklang-shopper.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now cooklang-shopper
   ```

   Alternatively, set up and use [pm2](https://pm2.keymetrics.io/docs/usage/quick-start/) or start the server manually:

   ```bash
   cd /path/to/cooklang-shopper/dist
   node server/index.mjs
   ```

### Per-user data files

In line with the file-first approach of the cooklang ecosystem, shopping lists, pantry files, category configuration files and product catalog files are plain text files stored on the server. Each file is scoped to a specific user via a **user key** derived from their login credentials:

- For **password authentication**: `password-{username}` (dots in the username replaced with underscores)
- For **OIDC authentication**: `{provider}-{userId}` (dots in either part replaced with underscores)
- For **Google / Microsoft accounts**: `account-{id}` (the internal database user id)

| Feature         | Directory                 | Filename pattern                 | Format                                                                         |
| --------------- | ------------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| Shopping list   | `dist/public/recipes/`    | `.shopping-list.{userKey}`       | Cooklang shopping list                                                         |
| Checked items   | `dist/public/recipes/`    | `.shopping-checked.{userKey}`    | Plain text                                                                     |
| Pantry          | `dist/public/pantry/`     | `pantry.{userKey}.conf`          | [TOML](https://toml.io)                                                        |
| Category config | `dist/public/categories/` | `category-config.{userKey}.conf` | Cooklang category DSL                                                          |
| Product catalog | `dist/public/catalog/`    | `catalog.{userKey}.toml`         | [TOML](https://cooklang-parser.tmlmt.com/v3/guide-product-catalog-syntax.html) |

The three latter ones can be edited in-app (Pantry page for the pantry; Category Config in the shopping list menu; Product Catalog page for the product catalog). You can also create or pre-populate them directly on the server before users log in. Refer to the [Cooklang conventions](https://cooklang.org/docs/conventions/) for the expected file formats.

### Account providers (Google / Microsoft)

In addition to password and OIDC logins, you can enable **invite-based accounts** backed by Google or Microsoft sign-in. Unlike the other providers, these accounts are managed from an in-app **User Management** page (available to users with the `admin` role) and each user has a persistent identity, email, role and status.

#### 1. Register an OAuth application

**Google** — in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an _OAuth client ID_ of type _Web application_ and add the following authorized redirect URI:

```
{baseUrl}/auth/google
```

**Microsoft** — in the [Microsoft Entra admin center](https://entra.microsoft.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade/quickStartType//sourceType/Microsoft_AAD_IAM) under _App registrations_, register a new application and add a _Web_ redirect URI:

```
{baseUrl}/auth/microsoft
```

You must have a registered Azure account to do so.

Replace `{baseUrl}` with the value of `baseUrl` in your `config.yaml` (e.g. `https://cookbook.example.com`). Note the client ID and client secret generated by each provider.

#### 2. Configure the providers

Add the corresponding provider blocks under `auth.providers` in `config.yaml` (see `config.yaml.example`).

Optionally configure an `smtp` block so invitations are emailed automatically. Without SMTP, invitations are still created and can be shared via a copyable invite link from the User Management page.

#### 3. Bootstrap the first admin

When account providers are configured but no user has signed in yet, a **one-time claim code** is generated at startup and printed to the server logs. Print it again at any time with:

```bash
pnpm admin:code
```

Sign in with Google or Microsoft, then navigate to `/claim-admin` (you are redirected there automatically on first login) and enter the claim code to promote your account to `admin`. Once any user signs in, the claim code is invalidated.

Alternatively, if you have `password_admin` configured, you can sign in as the password admin directly — no claim code needed. A password admin can then invite other users from the User Management page.

#### 4. Invite users

From the burger menu, open **User management** (visible to admins) to invite users by email, assign roles (`viewer`, `editor`, `admin`), resend invitations, edit, or delete accounts. Invited users complete sign-up by clicking their invite link and authenticating with Google or Microsoft.

#### Session revocation

When a Google/Microsoft account is deleted or deactivated (via User Management or the `reset-users` dev script), their session cookie is revoked on the next request — the server validates each account session against the database and clears it if the user no longer exists or is not active.

For **password** and **OIDC** sessions (which are stateless), revocation requires rotating `sessionSecret` in `config.yaml` and restarting the server. This invalidates all active sessions across all providers simultaneously.

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
- **AI recipe translation**: translate a recipe to the language of your choice in the editor (uses the same provider as for AI recipe conversion)

### Configuration

Deployment-specific locale settings can be overridden at runtime via the optional `i18n` section of `config.yaml` (see `config.yaml.example`). One can select the `defaultLocale`, `fallbackLocale` and `enabledLocales`.

All values must match locale codes shipped with the build (see Status sub-section below). Notes:

- Non-enabled locales are hidden from the swither but its physical route still resolves, as routes are build-baked.
- The app uses a `prefix_except_default` routing strategy with `en` as the build default. As a result, any other default set via `config.yaml` will be served under its prefix with `/` redirecting there. The routing strategy is baked at build and can't change at runtime.

### Contribution

Translations are managed via a public Crowdin project that you are welcome to contribute to.

- Project page / invite link: https://crowdin.com/project/cooklang-shopper/invite?h=40be1757be0533e87568e3721c162be52809579
- Translators can translate content and vote for existing translations to help select the best wording.

### Status

<!--TRANSLATION_STATUS_START-->

| Language    |                       Translation (%) |                      Proofreading (%) |
| ----------- | ------------------------------------: | ------------------------------------: |
| 🇩🇰 Dansk    | ![100%](https://progress-bar.xyz/100) |   ![23%](https://progress-bar.xyz/23) |
| 🇺🇸 English  | ![100%](https://progress-bar.xyz/100) | ![100%](https://progress-bar.xyz/100) |
| 🇫🇷 Français |   ![99%](https://progress-bar.xyz/99) |   ![79%](https://progress-bar.xyz/79) |

<!--TRANSLATION_STATUS_END-->

## Screenshots

![Screenshot 01](screenshot-01.png)

![Screenshot 02](screenshot-02.png)
