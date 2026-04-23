# Cooklang Shopper - AI Coding Instructions

## Project Overview

Self-hosted solution to interact with [Cooklang](https://cooklang.org/) recipes. Browse and manage recipes, generate shopping lists, and more. The project is built using Nuxt 4 and TypeScript.

## Package manager

The project uses `pnpm` as the package manager. Therefore, all package management commands should be run using `pnpm` instead of `npm` or `yarn`. For example:

- To install dependencies: `pnpm install`
- To add a new package: `pnpm add <package-name>`
- To run the development server: `pnpm dev`
- To build the project: `pnpm build`
- To run tests: `pnpm test`
- To lint the code: `pnpm lint`
- To run test with coverage: `pnpm test:coverage`

Similarly, all binaries exposed by packages and that you want to run without installing it is as a dependency should be run using `pnpx <binary-name>` instead of `npx` or `yarn dlx`. For example:

- `pnpx prisma <command>` to run Prisma CLI commands

## Architecture

The project is structured as per Nuxt 4 conventions. In particular:

- `app/assets/css/`: Contains global CSS files.
- `app/components/`: Contains Vue components used across the application.
- `app/composables/`: Contains reusable logic and state management using Vue's Composition API.
- `app/layouts/`: Contains layout components that define the overall structure of pages.
- `app/pages/`: Contains page components that correspond to different routes in the application.
- `app/stores`: Contains Pinia stores for state management.
- `app/utils/`: Contains utility functions and helpers.
- `server/api/`: Contains server-side API routes for handling backend logic.

## Special files

- `types.ts`: contain all Typescript type definitions used across the project. Use this file to define interfaces, types, and enums that are shared across multiple components or modules.

## Coding Style

- Use TypeScript for all code.
- Follow standard JavaScript/TypeScript coding conventions.
- Use Vue 3 Composition API for component logic.
- Use Pinia for state management.
- Use Nuxt UI components for consistent styling and UI elements.
- Avoid long comments; code should be self-explanatory where possible.

## Data Fetching Conventions

This project uses `nuxt-auth-utils` for session authentication. All API routes require a valid session cookie. This creates important constraints on which fetch method to use depending on the execution context.

### During page setup (SSR + hydration)

Use `useFetch` or `useAsyncData` for data needed during initial page render. These composables:

- Execute on the server during SSR and transfer the result to the client via the Nuxt payload (no double-fetch, no hydration flicker)
- Automatically proxy cookies/headers from the browser request to the server API call during SSR
- Are SSR-safe and can be used in composables called from `<script setup>`

```ts
// Single endpoint — use useFetch with a computed URL
const { data, status } = useFetch(() => `/api/recipe-images/${path.value}`);

// Multiple parallel requests — use useAsyncData
const headers = useRequestHeaders(["cookie"]); // capture at top level (setup context)
const { data } = useAsyncData("key", async () => {
  const results = await Promise.all(
    paths.map((p) => $fetch(`/api/endpoint/${p}`, { headers })),
  );
  return results;
});
```

### During user interactions (button clicks, form submits)

Use `$fetchWithHeaders` (defined in fetch.ts). After hydration, `useFetch`/`useAsyncData` lose access to the original SSR request headers. `$fetchWithHeaders` uses `useRequestHeaders` to forward the session cookie on every call.

```ts
// In an event handler or Pinia action
await $fetchWithHeaders(`/api/recipe/${path}`, { method: "DELETE" });
```

### Summary

| Context                       | Use                                       | Why                                                                       |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| Page setup / composable init  | `useFetch` or `useAsyncData`              | SSR payload transfer, auto cookie proxy, no flicker                       |
| User-triggered action         | `$fetchWithHeaders`                       | Manual cookie forwarding needed post-hydration                            |
| Inside `useAsyncData` handler | `$fetch` with `useRequestHeaders` headers | `$fetch` alone doesn't proxy cookies; pass headers captured at setup time |
| Never in `<script setup>`     | Bare `$fetch` without headers             | Double-fetches (server + client) and no cookie forwarding during SSR      |

## Imports

Elements exported in `server/utils`, `app/utils` and `shared/utils` are auto-imported, so do not import them in any file within `server/` and `app/`.
