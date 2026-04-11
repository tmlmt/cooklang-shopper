# Cooklang Shopper

<picture><img src="https://badges.ws/maintenance/yes/2026" /></picture>
<picture><img src="https://badges.ws/github/release/tmlmt/cooklang-shopper" /></picture>

Self-hosted, Nuxt-powered web app to manage cooklang recipes, create a shopping list, fill a cart with matching products and send it to an online store. Using the [`@tmlmt/cooklang-parser`](https://cooklang-parser.tmlmt.com/v3) Typescript parser, in its v3 version (alpha stage).

The app is currently in pre-v1 i.e beta version and in active development. Only recipe management (browsing, viewing, creating, editing) is functional at the moment while the rest is partially developed and therefore hidden an `experimental` flag. Feel free to test it out and report issues or feature requests.

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
4. Edit `config.yaml` — set the different parameters (see the file for instructions)
5. Add your `.cook` recipe files to `dist/public/recipes/`
6. Set up the systemd service:

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

> **Note:** Stop the server before upgrading and restart it afterward.
>
> ```bash
> sudo systemctl stop cooklang-shopper
> ./upgrade.sh
> sudo systemctl start cooklang-shopper
> ```

## Roadmap

1. Stabilize recipe management
2. Internationalization (i18n)
3. Finalize shopping list features
4. Finalize shopping cart features
5. Develop feature to send cart to a pre-configured online store
6. Add customization possibilities

## Screenshots

![Screenshot 01](screenshot-01.png)

![Screenshot 02](screenshot-02.png)
