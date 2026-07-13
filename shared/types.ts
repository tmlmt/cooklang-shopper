import type { RecipeChoices } from "@tmlmt/cooklang-parser";

export interface FederationConfig {
  enabled: boolean;
  feedTitle: string;
  feedAuthor: string;
  description?: string;
}

export interface SharingAboutConfig {
  author?: string;
  description?: string;
  contact?: string;
}

export interface SharingConfig {
  defaultVisibility: "public" | "private";
  allowPublicBrowsing: boolean;
  viewerCanShare?: boolean;
  federation?: FederationConfig;
  about?: SharingAboutConfig;
}

export interface PublicSharingConfig {
  defaultVisibility: "public" | "private";
  allowPublicBrowsing: boolean;
  viewerCanShare: boolean;
  federationEnabled: boolean;
  about?: SharingAboutConfig;
}

export type Role = "viewer" | "editor" | "admin";

export type AuthProviderType = "password" | "oidc" | "google" | "microsoft";

export interface PasswordProviderConfig {
  password_editor: string;
  password_viewer: string;
  /** Optional: enables admin role for password login when set. */
  password_admin?: string;
}

export interface OidcRoleMapping {
  claim: string;
  value: string;
}

export interface OidcProviderConfig {
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  scope?: string[];
  roleMapping: {
    editor: OidcRoleMapping;
    viewer?: OidcRoleMapping;
  };
}

export interface PasswordAuthProvider {
  type: "password";
  name: string;
  config: PasswordProviderConfig;
}

export interface OidcAuthProvider {
  type: "oidc";
  name: string;
  config: OidcProviderConfig;
}

export interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
}

export interface MicrosoftProviderConfig {
  clientId: string;
  clientSecret: string;
  /** Microsoft tenant. Use "common" or "consumers" for personal accounts. */
  tenant?: string;
}

export interface GoogleAuthProvider {
  type: "google";
  name: string;
  config: GoogleProviderConfig;
}

export interface MicrosoftAuthProvider {
  type: "microsoft";
  name: string;
  config: MicrosoftProviderConfig;
}

export type AuthProviderEntry =
  | PasswordAuthProvider
  | OidcAuthProvider
  | GoogleAuthProvider
  | MicrosoftAuthProvider;

export interface PublicAuthProvider {
  type: AuthProviderType;
  name: string;
}

/**
 * How the DB-backed user directory coexists with config-based OIDC role mapping.
 * - "fallback": DB identities take precedence; unknown OIDC users fall back to
 *   config claim role mapping (backward compatible).
 * - "authoritative": only users present in the DB directory may sign in via the
 *   account providers; generic OIDC still uses its own claim mapping.
 */
export type DirectoryMode = "fallback" | "authoritative";

export interface AuthConfig {
  providers: AuthProviderEntry[];
  directory?: DirectoryMode;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
}

export type UserStatus = "invited" | "active";

export interface AdminUser {
  id: number;
  email: string;
  displayName: string | null;
  role: Role;
  status: UserStatus;
  /** Linked identity providers (e.g. ["google"]). */
  providers: string[];
  createdAt: string;
  /** Expiry of the pending invitation, if the user is still "invited". */
  inviteExpiresAt: string | null;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export type ShoppingEnabled = boolean | "editor-only";

export interface ShoppingConfig {
  enabled: ShoppingEnabled;
}

/** Non-secret configuration for the online store integration. */
export interface OnlineStoreConfig {
  /** Adapter id, e.g. "nemlig". Must match a registered adapter. */
  provider: string;
}

export interface CartConfig {
  enabled: ShoppingEnabled;
  /** Optional online store integration for sending the cart. */
  store?: OnlineStoreConfig;
}

export type AiProviderType = "openai" | "anthropic" | "local";

export interface AiConfig {
  provider: AiProviderType;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface I18nConfig {
  defaultLocale?: string;
  fallbackLocale?: string;
  enabledLocales?: string[];
}

export interface AppConfig {
  auth: AuthConfig;
  sessionSecret: string;
  ogImageSecret?: string;
  shopping?: ShoppingConfig;
  cart?: CartConfig;
  title?: string;
  description?: string;
  baseUrl?: string;
  sharing?: SharingConfig;
  ai?: AiConfig;
  i18n?: I18nConfig;
  smtp?: SmtpConfig;
}

export interface RecipeChoicesWire {
  ingredientItems: Array<[string, number]>;
  ingredientGroups: Array<[string, number]>;
  variant?: string;
}

export interface RecipeInfo {
  title: string;
  path: string;
  servings: number;
  choices?: RecipeChoices;
  /** Locale variant chosen when this recipe was added to the shopping list */
  locale?: string;
}

export interface RecipeEssentials {
  name: string;
  title: string;
  dir: string;
  servings: number;
  tags: string[];
  lastModified?: string;
  times?: {
    prep?: number | string;
    cook?: number | string;
    total?: number | string;
  };
  author?: string;
  source?: string;
  description?: string;
  difficulty?: string;
  /** Language codes available via {name}.xx.cook variant files */
  locales?: string[];
  /** Locale of the default file ({name}.cook), detected from metadata or app config */
  defaultLocale?: string;
}

export interface LocaleOption {
  /** undefined = default file ({name}.cook), string = .xx.cook variant */
  code: string | undefined;
  label: string;
}

/** A (possibly nested) i18n translation dictionary loaded for a recipe locale. */
export type TranslationDict = Record<string, unknown>;

export interface RecipeIndex {
  [key: string]: RecipeEssentials;
}

export interface MetadataDisplayValue {
  text: string;
  href?: string;
}

export interface RecipeImageManifest {
  coverImage?: string;
  heroImages: string[];
  stepImagesByNumber: Record<string, string>;
  hasImages: boolean;
}

export interface ShareLink {
  id: number;
  token: string;
  recipePath: string;
  locale?: string;
  expiresAt: string | null;
  createdAt: string;
  expired: boolean;
}

export interface ShoppingListShareLink {
  id: number;
  token: string;
  ownerName: string;
  expiresAt: string | null;
  createdAt: string;
  expired: boolean;
}

/** A single product line to send to the online store cart. */
export interface OnlineStoreItem {
  productId: string;
  quantity: number;
}

/** Connection status of the online store integration for the current user. */
export interface OnlineStoreStatus {
  /** Whether a store integration is configured at all. */
  configured: boolean;
  /** The configured adapter id, if any. */
  provider?: string;
  /** Whether the current user has an active store session. */
  connected: boolean;
  /** The items last successfully sent to the store, for diff-based sync. */
  lastSent: OnlineStoreItem[];
}

/** Result of syncing the cart to the online store. */
export interface OnlineStoreSyncResult {
  added: OnlineStoreItem[];
  removed: OnlineStoreItem[];
  failed: Array<OnlineStoreItem & { error: string }>;
  lastSent: OnlineStoreItem[];
}

// https://stackoverflow.com/questions/78945320/how-to-handle-nodejs-errors-in-typescript
export interface BaseSystemError<Code extends string = string> extends Error {
  /** The string error code */
  code: Code;

  /** The system-provided error number */
  errno: number;

  /** A system-provided human-readable description of the error */
  message: string;

  /** The name of the system call that triggered the error */
  syscall: string;
}
