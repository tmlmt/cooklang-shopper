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

export type Role = "viewer" | "editor";

export type AuthProviderType = "password" | "oidc";

export interface PasswordProviderConfig {
  password_editor: string;
  password_viewer: string;
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

export type AuthProviderEntry = PasswordAuthProvider | OidcAuthProvider;

export interface PublicAuthProvider {
  type: AuthProviderType;
  name: string;
}

export interface AuthConfig {
  providers: AuthProviderEntry[];
}

export type ShoppingEnabled = boolean | "editor-only";

export interface ShoppingConfig {
  enabled: ShoppingEnabled;
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
  disabledLocales?: string[];
}

export interface AppConfig {
  auth: AuthConfig;
  sessionSecret: string;
  ogImageSecret?: string;
  shopping?: ShoppingConfig;
  experimental?: boolean;
  title?: string;
  description?: string;
  baseUrl?: string;
  sharing?: SharingConfig;
  ai?: AiConfig;
  i18n?: I18nConfig;
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
