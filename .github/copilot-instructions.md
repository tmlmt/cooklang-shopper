# Cooklang Shopper - AI Coding Instructions

## Project Overview

Self-hosted solution to interact with [Cooklang](https://cooklang.org/) recipes. Browse and manage recipes, generate shopping lists, and more. The project is built using Nuxt 4 and TypeScript.

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

## Coding Style

- Use TypeScript for all code.
- Follow standard JavaScript/TypeScript coding conventions.
- Use Vue 3 Composition API for component logic.
- Use Pinia for state management.
- Use Nuxt UI components for consistent styling and UI elements.
- Avoid long comments; code should be self-explanatory where possible.
