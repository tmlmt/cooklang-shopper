#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
REPO="tmlmt/cooklang-shopper"
API_URL="https://api.github.com/repos/${REPO}/releases"
DIST_DIR="dist"
BACKUP_DIR="dist.bak"

# --- Color helpers ---
info()    { printf '\033[34mINFO\033[0m: %s\n' "$1"; }
success() { printf '\033[32mSUCCESS\033[0m: %s\n' "$1"; }
error()   { printf '\033[31mERROR\033[0m: %s\n' "$1" >&2; }
warn()    { printf '\033[33mWARN\033[0m: %s\n' "$1"; }

# --- Argument parsing ---
EDGE=false
TAG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --edge)
      EDGE=true
      shift
      ;;
    --tag)
      if [[ -z "${2:-}" ]]; then
        error "Missing value for --tag"
        exit 1
      fi
      TAG="$2"
      shift 2
      ;;
    -h|--help)
      cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Upgrade cooklang-shopper to the latest release.

Options:
  --edge        Include pre-releases when finding the latest version
  --tag <tag>   Download a specific version (e.g. v1.0.0)
  -h, --help    Show this help message
EOF
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      exit 1
      ;;
  esac
done

# --- Prerequisites ---
for cmd in curl tar; do
  if ! command -v "$cmd" &>/dev/null; then
    error "$cmd is required but not installed."
    exit 1
  fi
done

# --- Fetch release info ---
if [[ -n "$TAG" ]]; then
  info "Fetching release info for tag: $TAG"
  RELEASE_JSON=$(curl -sfL "${API_URL}/tags/${TAG}") || {
    error "Failed to fetch release for tag $TAG. Check that the tag exists."
    exit 1
  }
else
  if [[ "$EDGE" == true ]]; then
    info "Fetching latest release (including pre-releases)..."
    # Get the first non-draft release (which may be a pre-release)
    RELEASE_JSON=$(curl -sfL "${API_URL}?per_page=10") || {
      error "Failed to fetch releases from GitHub API."
      exit 1
    }
    # Extract the first release entry from the JSON array
    # The API returns releases sorted by creation date, newest first
    RELEASE_JSON=$(printf '%s' "$RELEASE_JSON" | sed -n '/^  {$/,/^  }/{ p; /^  }/q }')
  else
    info "Fetching latest stable release..."
    RELEASE_JSON=$(curl -sfL "${API_URL}/latest") || {
      error "Failed to fetch latest release from GitHub API."
      exit 1
    }
  fi
fi

# --- Parse release JSON ---
# Extract tag_name
RELEASE_TAG=$(printf '%s' "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
if [[ -z "$RELEASE_TAG" ]]; then
  error "Could not determine release tag from API response."
  exit 1
fi
info "Found release: $RELEASE_TAG"

# Extract the tarball asset URL (cooklang-shopper-v*.tar.gz)
ASSET_URL=$(printf '%s' "$RELEASE_JSON" | grep '"browser_download_url"' | grep 'cooklang-shopper-.*\.tar\.gz' | head -1 | sed 's/.*"browser_download_url"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
if [[ -z "$ASSET_URL" ]]; then
  error "Could not find a cooklang-shopper tarball asset in release $RELEASE_TAG."
  exit 1
fi
info "Asset URL: $ASSET_URL"

# --- Download ---
ARCHIVE_FILE="cooklang-shopper-${RELEASE_TAG}.tar.gz"
info "Downloading $ARCHIVE_FILE..."
curl -fL -o "$ARCHIVE_FILE" "$ASSET_URL" || {
  error "Failed to download release archive."
  exit 1
}
success "Download complete."

# --- Backup ---
if [[ -d "$BACKUP_DIR" ]]; then
  info "Removing previous backup ($BACKUP_DIR)..."
  rm -rf "$BACKUP_DIR"
fi

if [[ -d "$DIST_DIR" ]]; then
  info "Backing up current $DIST_DIR to $BACKUP_DIR..."
  mv "$DIST_DIR" "$BACKUP_DIR"
  success "Backup created."
else
  warn "No existing $DIST_DIR found. Performing fresh install."
fi

# --- Extract ---
info "Extracting $ARCHIVE_FILE..."
tar -xzf "$ARCHIVE_FILE"
success "Extraction complete."

# --- Restore user data from backup ---
if [[ -d "$BACKUP_DIR" ]]; then
  info "Restoring user data from backup..."

  # Restore recipes
  if [[ -d "$BACKUP_DIR/public/recipes" ]]; then
    cp -a "$BACKUP_DIR/public/recipes/." "$DIST_DIR/public/recipes/"
    info "Restored recipes."
  fi

  # Restore category configurations
  if [[ -d "$BACKUP_DIR/public/categories" ]]; then
    cp -a "$BACKUP_DIR/public/categories/." "$DIST_DIR/public/categories/"
    info "Restored category configurations."
  fi

  # Restore product catalogs
  if [[ -d "$BACKUP_DIR/public/catalog" ]]; then
    cp -a "$BACKUP_DIR/public/catalog/." "$DIST_DIR/public/catalog/"
    info "Restored product catalogs."
  fi

  # Restore pantries
  if [[ -d "$BACKUP_DIR/public/pantry" ]]; then
    cp -a "$BACKUP_DIR/public/pantry/." "$DIST_DIR/public/pantry/"
    info "Restored pantries."
  fi

  # Restore product catalog example
  if [[ -d "$BACKUP_DIR/public/config" ]]; then
    cp -a "$BACKUP_DIR/public/config/." "$DIST_DIR/public/config/"
    info "Restored product catalog example."
  fi

  # Restore config.yaml
  if [[ -f "$BACKUP_DIR/config.yaml" ]]; then
    cp -a "$BACKUP_DIR/config.yaml" "$DIST_DIR/config.yaml"
    info "Restored config.yaml."
  fi

  # Restore database
  if [[ -d "$BACKUP_DIR/data" ]]; then
    mkdir -p "$DIST_DIR/data"
    cp -a "$BACKUP_DIR/data/." "$DIST_DIR/data/"
    info "Restored database."
  fi

  success "User data restored."
fi

# --- Cleanup ---
info "Cleaning up downloaded archive..."
rm -f "$ARCHIVE_FILE"

# --- Summary ---
echo ""
success "Upgraded to $RELEASE_TAG"
echo ""
info "To start the server, run (replace with your custom runner as relevant):"
info "  cd $DIST_DIR && node server/index.mjs"
echo ""
if [[ ! -f "$DIST_DIR/config.yaml" ]]; then
  warn "No config.yaml found. Copy the example and edit it:"
  warn "  cp $DIST_DIR/config.yaml.example $DIST_DIR/config.yaml"
fi
