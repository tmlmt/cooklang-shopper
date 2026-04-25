---
name: commit-message
description: "Draft a conventional commit message for all current staged or unstaged changes and present it as markdown in chat. Use when user asks to draft, write, or generate a commit message, or mentions /commit-message. Does NOT execute any git commands. Generates a single-line conventional commit header (no body paragraphs). Asks about issue references and detects breaking changes."
argument-hint: "Optional: type, scope, or short description to guide message generation"
---

# Commit Message

Draft a conventional commit message for the current changes and present it as a markdown code block in chat. Do not stage files, do not run `git commit`, do not take any action.

## Message Format

```
<type>[optional scope]: <description>

[Resolves: #<issue> | Fixes: #<issue>]

[BREAKING CHANGE: <description>]
```

Rules:

- **Header only** — no body paragraphs, no bullet lists summarising the diff.
- Issue reference: use `Fixes: #<n>` when the commit type is `fix`; use `Resolves: #<n>` for all other types.
- Breaking changes go in a `BREAKING CHANGE:` footer, separated from the header by a blank line. Use a list if there are multiple, inline text if only one. The presence of a breaking change also triggers the commit type to be followed by an exclamation mark, e.g. "feat!"

## Commit Types

| Type       | Purpose                              |
| ---------- | ------------------------------------ |
| `feat`     | New feature                          |
| `fix`      | Bug fix                              |
| `docs`     | Documentation only                   |
| `style`    | Formatting / style (no logic)        |
| `refactor` | Code restructure (no feature or fix) |
| `perf`     | Performance improvement              |
| `test`     | Add or update tests                  |
| `build`    | Build system / dependencies          |
| `ci`       | CI or config changes                 |
| `chore`    | Maintenance / misc                   |
| `revert`   | Revert a commit                      |

## Procedure

### 1. Analyse the diff

```bash
git diff --staged    # if anything is staged
git diff             # otherwise use working tree
git status --porcelain
```

### 2. Draft the commit message

From the diff determine:

- **Type** — what kind of change?
- **Scope** — which module or area (optional)?
- **Description** — one imperative-mood summary, present tense, under 72 chars.

Do **not** add a body paragraph or list of changes.

Detect breaking changes: if any public API, config key, URL, or data format is altered in a non-backward-compatible way, prepare a `BREAKING CHANGE:` footer.

### 3. Ask the user

Ask a single question: "Does this commit fix or resolve a GitHub issue? If so, provide the issue number."

Do not ask any other questions unless breaking changes were detected and their description is ambiguous.

### 4. Present in chat

Output the final commit message as a markdown code block. Do not run any git commands.

## Examples

Feature with issue reference:

```
feat(shopping-list): add store run button to shared layout

Resolves: #42
```

Fix with issue reference:

```
fix(middleware): prevent SSR 302 on shared list redirect

Fixes: #7
```

Fix with breaking change:

```
fix: rename share API paths

BREAKING CHANGE: `/api/sharing/*` routes renamed to `/api/sharing/recipe/*` and `/api/sharing/list/*`
```

Multiple breaking changes:

```
refactor: consolidate shopping list mutations

BREAKING CHANGE:
- Proxy mutation routes removed; use `/api/shopping-list` with `?token=` instead
- `useShoppingStore.addRecipe` moved to `useShoppingListActions`
```
